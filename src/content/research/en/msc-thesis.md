---
title: "Secure publication of aggregate statistics in verifiable electronic voting"
summary: "My thesis designs a cryptographic mechanism to publish statistics of a verifiable electronic vote without compromising ballot secrecy."
institution: "CLCERT, Universidad de Chile"
advisors: ["Alejandro Hevia", "Camilo Gómez"]
status: "Submitted and under review. Defense expected between December 2026 and February 2027."
year: "2026"
kind: "thesis"
---

Thesis for the M.Sc. in Computer Science (Magíster en Ciencias, mención Computación) at Universidad de Chile. Under the double degree program, the same thesis also completes my Computer Engineering degree.

### The problem

In a verifiable electronic vote, each voter can check that their ballot was counted as cast, and anyone can check that the result matches the recorded ballots. All of this without anyone learning how each person voted.

Beyond the total, an organization often wants to publish statistics: how each group voted, for example each school, or students, academics and staff separately. That is where the risk appears. If three people voted in a group and all three chose the same option, the group's result reveals each of their votes. Crossing two labels that look harmless on their own can produce groups that small, and a very lopsided result allows strong inferences even when the group is not that small.

### Why it has to be verifiable

A simple way out is to let the election authority review the data in private and decide what to publish. But then everyone has to trust it: nobody else can check that those statistics come from the ballots actually cast. A verifiable vote exists precisely to avoid depending on that trust, and the statistics published with it should follow the same rule.

### What the thesis aims for

A cryptographic mechanism to publish statistics of a verifiable electronic vote without compromising ballot secrecy, so the statistics stay useful and can be verified just like the result. The context is UParticipa, a verifiable electronic voting system.

I will publish the text after the defense.
