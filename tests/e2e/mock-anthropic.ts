/**
 * A fake Anthropic Messages API for local end-to-end runs of the CV
 * generator: no key, no network, no cost. Point the Worker at it with
 * ANTHROPIC_BASE_URL=http://127.0.0.1:8788 (see README, "CV generator").
 *
 *   bun tests/e2e/mock-anthropic.ts [port]
 *
 * Screening (Haiku) answers from the text: "NOT_A_JOB" is not a job
 * description, "ignore previous instructions" is an injection. Selection
 * (Sonnet) picks the first highlights its schema allows, and on purpose adds
 * an unknown id and a rewrite with an invented metric, which the validator
 * must drop and revert. Each request is logged without its content.
 */

import { createServer, type IncomingMessage } from "node:http";

const port = Number(process.argv[2] ?? 8788);

interface MessagesRequest {
  model: string;
  system?: string;
  messages: { content: { type: string; text: string }[] }[];
  output_config?: { format?: { schema?: SchemaNode } };
}

interface SchemaNode {
  properties?: Record<string, SchemaNode>;
  items?: SchemaNode;
  enum?: string[];
}

function read(request: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let body = "";
    request.setEncoding("utf8");
    request.on("data", (chunk: string) => {
      body += chunk;
    });
    request.on("end", () => resolve(body));
    request.on("error", reject);
  });
}

function message(model: string, output: unknown) {
  return {
    id: `msg_mock_${Date.now()}`,
    type: "message",
    role: "assistant",
    model,
    content: [{ type: "text", text: JSON.stringify(output) }],
    stop_reason: "end_turn",
    stop_sequence: null,
    stop_details: null,
    usage: {
      input_tokens: 1200,
      output_tokens: 300,
      cache_read_input_tokens: 0,
      cache_creation_input_tokens: 0,
    },
  };
}

function highlightText(system: string, id: string): string {
  const match = new RegExp(
    `"id": "${id.replaceAll(".", "\\.")}",[^}]*?"text": "((?:[^"\\\\]|\\\\.)*)"`,
  ).exec(system);
  return match?.[1] ? JSON.parse(`"${match[1]}"`) : "";
}

function selection(request: MessagesRequest) {
  const schema = request.output_config?.format?.schema;
  const ids =
    schema?.properties?.sections?.items?.properties?.items?.items?.properties?.source_id?.enum ??
    [];
  const system = request.system ?? "";
  const pick = (prefix: string) => ids.filter((id) => id.startsWith(prefix));
  const projects = [...pick("password-manager."), ...pick("nodus.")].slice(0, 3);
  const work = [...pick("dimacofi.rpa."), ...pick("clcert.")].slice(0, 3);
  const first = projects[0] ?? ids[0] ?? "";
  return {
    summary: { text: highlightText(system, first), source_ids: [first] },
    sections: [
      {
        section: "projects",
        items: [
          ...projects.map((id, index) => ({
            source_id: id,
            // The second rewrite invents a metric: the validator must revert it.
            rewrite:
              index === 1
                ? `${highlightText(system, id).slice(0, 120)} Cut costs by 45%.`
                : highlightText(system, id),
          })),
          { source_id: "invented.highlight.01", rewrite: "Led a team of 30 at Google." },
        ],
      },
      {
        section: "work",
        items: work.map((id) => ({ source_id: id, rewrite: highlightText(system, id) })),
      },
    ],
    rationale: [...projects, ...work].map((id) => ({
      source_id: id,
      reason: `Mock reason for ${id}: matches the role.`,
    })),
  };
}

const server = createServer(async (request, response) => {
  if (request.method !== "POST" || !request.url?.startsWith("/v1/messages")) {
    response.writeHead(404).end();
    return;
  }
  const body = JSON.parse(await read(request)) as MessagesRequest;
  // The visitor's text is the first block (the JSON data block); the second is our instruction.
  const text = body.messages[0]?.content[0]?.text ?? "";
  const isSelection = body.model.includes("sonnet");
  console.log(
    `${new Date().toISOString()} ${body.model} ${isSelection ? "selection" : "screening"}`,
  );

  const output = isSelection
    ? selection(body)
    : {
        is_job_description: !text.includes("NOT_A_JOB"),
        injection_suspected: /ignore previous instructions/i.test(text),
        language: "en",
      };
  // A little latency, so the progress states show.
  await new Promise((resolve) => setTimeout(resolve, isSelection ? 2500 : 800));
  response.writeHead(200, { "content-type": "application/json", "request-id": "req_mock" });
  response.end(JSON.stringify(message(body.model, output)));
});

server.listen(port, "127.0.0.1", () => {
  console.log(`Mock Anthropic API on http://127.0.0.1:${port}`);
});
