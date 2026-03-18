
Jeg forstår opgaven, og den nuværende 5-års oprydning er for bred i forhold til det, du ønsker.

Hvad der bliver slettet lige nu
- Den nuværende cleanup-funktion sletter efter `created_at`, ikke efter seneste aktivitet.
- Den sletter i dag bl.a.:
  - rapporter
  - dokumentation
  - verifikationsskemaer
  - chatbeskeder
  - field reports
  - timeregistreringer
  - fakturaer
  - audit reports
  - afvigelser
  - medarbejdercertifikater
  - firmadokumenter
  - instrumenter
  - planlægning
  - sags-tilknytninger
  - sager og kunder hvis de gamle nok og uden afhængigheder
- Det matcher ikke dit krav om kun at slette “forældet forretningsdata” og kun når der ikke har været ny aktivitet i 5 år.

Det du ønsker i stedet
- Kun data der er ligegyldigt efter 5 år skal slettes.
- 5-årsfristen skal nulstilles ved ny aktivitet.
- Hvis du fx:
  - redigerer en kunde
  - redigerer en sag
  - opretter en faktura på en sag/kunde
  - opretter rapport/skema/dokumentation
  - laver planlægning eller timeregistrering
  så skal kunden/sagen ikke slettes, fordi der har været ny aktivitet.
- Selve systemet må ikke slettes:
  - brugere/profiler
  - roller
  - firmadokumenter
  - instrumenter
  - øvrig systemopsætning

Plan for rettelsen
1. Begrænse hvad der overhovedet må auto-slettes
- Beholde uden auto-slet:
  - profiler
  - roller
  - chat
  - firmadokumenter
  - instrumenter
  - audit reports
  - afvigelser
  - medarbejdercertifikater
  - andre systemtabeller
- Kun auto-slette:
  - fakturaer
  - rapporter
  - verifikationsskemaer
  - sagsdokumentation
  - planlægning
  - timeregistreringer
  - sager
  - kunder

2. Skifte fra “created_at” til “seneste aktivitet”
- For direkte poster:
  - fakturaer: brug `updated_at` hvis den findes, ellers `created_at`
  - rapporter: brug `updated_at` hvis den findes, ellers `created_at`
  - planlægning: brug `updated_at` hvis den findes, ellers `created_at`
  - timeregistreringer/dokumentation/verifikationsskemaer: i dag har nogle kun `created_at`, så de vurderes efter deres egen seneste kendte timestamp
- For kunder og sager:
  - de må ikke slettes på deres oprindelige oprettelsesdato alene
  - de skal vurderes ud fra seneste aktivitet på hele relationen

3. Definere aktivitet for en sag/kunde
- En sag regnes som aktiv hvis noget af dette er nyere end 5 år:
  - sagen selv er oprettet eller redigeret
  - kunden er redigeret
  - der findes nyere faktura
  - nyere rapport
  - nyere verifikationsskema
  - nyere dokumentation
  - nyere planlægning
  - nyere timeregistrering
- En kunde regnes som aktiv hvis:
  - kunden selv er redigeret
  - eller mindst én tilknyttet sag har aktivitet inden for 5 år

4. Opdatere cleanup-funktionen
- Først slette gamle underposter:
  - fakturaer
  - rapporter
  - verifikationsskemaer
  - dokumentation
  - planlægning
  - timeregistreringer
- Derefter kun slette sager hvor “seneste aktivitet” er ældre end 5 år.
- Til sidst kun slette kunder hvor:
  - kunden selv ikke er rørt i 5 år
  - og ingen tilknyttede sager har aktivitet i 5 år

5. Gøre retention-logikken mere robust
- Jeg vil anbefale at tilføje en intern “last activity”-beregning i SQL i cleanup-funktionen i stedet for bare at kigge på `created_at`.
- Hvis nødvendigt kan vi senere udvide med dedikerede `updated_at` kolonner på tabeller som i dag kun har `created_at`, men første version kan stadig løse dit krav ved at beregne aktivitet ud fra relationer.

Tekniske detaljer
```text
Sag sidste aktivitet =
MAX(
  case.updated_at / created_at,
  customer.updated_at / created_at,
  seneste invoice.updated_at/created_at,
  seneste report.updated_at/created_at,
  seneste verification_form.created_at,
  seneste documentation.created_at,
  seneste schedule.updated_at/created_at,
  seneste time_entry.created_at
)

Kunde sidste aktivitet =
MAX(
  customer.updated_at / created_at,
  seneste aktivitet på alle kundens sager
)
```

Vigtige rettelser jeg vil lave
- Fjerne auto-sletning af systemdata, som ikke skal røres.
- Omskrive retention til aktivitetsbaseret sletning.
- Sikre at en ny faktura eller ændring på kunde/sag holder kunden og sagen i live.
- Beholde den automatiske kørsel, men gøre logikken sikker.

Forventet resultat efter rettelsen
- En kunde fra for 4 år siden bliver ikke slettet, hvis du lige har oprettet en ny faktura eller redigeret kunden.
- En sag bliver ikke slettet, hvis der er nyere aktivitet på sagen.
- Kun gamle, ubrugte forretningsdata uden aktivitet i over 5 år bliver fjernet.
- Selve systemet og vigtige stamdata bliver ikke slettet automatisk.
