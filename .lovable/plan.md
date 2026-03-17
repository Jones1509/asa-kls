
Sådan hænger de tre numre sammen i systemet lige nu:

```text
Kunde
  K-002
  Jim Andersen

Sag under den kunde
  K-002-01
  El-installation 2024

Faktura på den sag
  F-2026-001
  Faktura for K-002-01
```

1. Kundenummer
- Format: `K-001`, `K-002`, `K-003` osv.
- Det er kundens faste hovednummer.
- Hver kunde får ét unikt kundenummer.
- Nye kunder får det automatisk ved oprettelse.
- Eksisterende kunder er tænkt tildelt nummer i oprettelses-rækkefølge.

2. Sagsnummer
- Format: `K-002-01`
- Det er bygget direkte oven på kundenummeret:
  - `K-002` = kunden
  - `-01` = kundens første sag
- Hvis samme kunde får flere sager, bliver de:
  - `K-002-01`
  - `K-002-02`
  - `K-002-03`
- Det betyder, at man altid kan se hvilken kunde sagen tilhører bare ved at læse sagsnummeret.

3. Fakturanummer
- Format: `F-2026-001`
- Det er et separat nummersystem kun til fakturaer.
- Det er ikke bygget ind i kunde- eller sagsnummeret.
- `2026` er året.
- `001` er løbenummeret for fakturaer i det år.
- Ved nyt år starter faktura-løbenummeret forfra:
  - `F-2026-001`
  - `F-2026-002`
  - ...
  - `F-2027-001`

Sådan hænger de sammen i praksis
- Kundenummer identificerer kunden.
- Sagsnummer identificerer en konkret sag under kunden.
- Fakturanummer identificerer selve fakturaen i regnskabet.
- Fakturaen peger så på en sag, og sagen peger på en kunde.

Derfor kan en faktura vises sådan:
- `F-2026-001 · K-002-01 · Jim Andersen · El-installation 2024`

Det betyder:
- `F-2026-001` = denne specifikke faktura
- `K-002-01` = sagen fakturaen handler om
- `Jim Andersen` = kunden bag sagen
- `El-installation 2024` = sagsbeskrivelsen

Hvorfor den struktur er smart
- Kundenummer bruges til kundekartoteket.
- Sagsnummer bruges til drift, planlægning, dokumentation og timeregistrering.
- Fakturanummer bruges til bogføring og økonomi.
- Man får både et regnskabsnummer og en tydelig kobling tilbage til kunde og sag.

Teknisk set i jeres løsning
- Kundenummer genereres automatisk som næste `K-xxx`.
- Sagsnummer genereres automatisk ud fra kundens nummer + næste sagsløbenummer for den kunde.
- Fakturanummer genereres automatisk ud fra fakturaens år + næste fakturaløbenummer det år.
- Dropdowns bruger sagslabelen i formatet:
  - `Sagsnummer · Kundenavn · Sagsbeskrivelse`

Kort huskeregel
```text
K = Kunde
K-xxx-yy = Sag under kunden
F-år-xxx = Faktura
```

Eksempel med dine data
```text
K-002 = Jim Andersen
K-002-01 = Jim Andersen · El-installation 2024
F-2026-001 = Faktura for K-002-01
```

Hvis du vil, kan næste trin være at jeg gennemgår om nummereringen også vises helt konsekvent på tværs af kundeliste, sagsliste, fakturaoversigt og alle dropdowns, så intet sted falder tilbage til gamle labels.
