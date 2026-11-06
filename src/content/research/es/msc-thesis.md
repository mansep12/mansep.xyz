---
title: "Publicación segura de estadísticas agregadas en votación electrónica verificable"
summary: "Mi tesis diseña un mecanismo criptográfico para publicar estadísticas de una votación electrónica verificable sin comprometer el secreto del voto."
institution: "CLCERT, Universidad de Chile"
advisors: ["Alejandro Hevia", "Camilo Gómez"]
status: "Entregada y en revisión. Defensa prevista entre diciembre de 2026 y febrero de 2027."
year: "2026"
kind: "thesis"
---

Tesis para el Magíster en Ciencias, mención Computación, de la Universidad de Chile. Por la doble titulación, la misma tesis completa también Ingeniería Civil en Computación.

### El problema

En una votación electrónica verificable, cada votante puede comprobar que su voto se contó tal como lo emitió, y cualquiera puede comprobar que el resultado corresponde a los votos registrados. Todo eso sin que nadie sepa por quién votó cada persona.

Además del total, a una organización le suele interesar publicar estadísticas: cómo votó cada grupo, por ejemplo cada facultad o cada estamento. Ahí aparece el riesgo. Si en un grupo votaron tres personas y las tres eligieron la misma opción, el resultado de ese grupo revela el voto de cada una. Cruzar dos etiquetas que por separado parecen inofensivas puede producir grupos así de chicos, y un resultado muy desbalanceado permite inferir bastante aunque el grupo no sea tan pequeño.

### Por qué tiene que ser verificable

Una salida simple es que la autoridad electoral revise los datos en privado y decida qué publicar. Pero entonces hay que confiar en ella: nadie más puede comprobar que esas estadísticas salen de los votos realmente emitidos. Una votación verificable existe justamente para no depender de esa confianza, y las estadísticas que la acompañan deberían cumplir la misma regla.

### Qué busca la tesis

Un mecanismo criptográfico para publicar estadísticas de una votación electrónica verificable sin comprometer el secreto del voto, de modo que las estadísticas sigan siendo útiles y se puedan verificar igual que el resultado. El contexto es UParticipa, un sistema de votación electrónica verificable.

Publicaré el texto después de la defensa.
