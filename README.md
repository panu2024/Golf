# Golfvahti

Golfvahti on suomenkielinen paikallinen verkkosovelluksen prototyyppi. Pelaaja hakee sopivia lähtöaikoja ja tallentaa hakuehdot vahdiksi. Kentän demo havainnollistaa uuden lähtöajan ja peruutuksen vaikutusta hakutuloksiin sekä vahtien ilmoituksiin.

Kaikki kentät ja lähtöajat ovat kuvitteellisia. Sovellus ei tee varauksia. Ilmoitukset toimivat vain sovelluksen ollessa auki. Oikeat kenttäintegraatiot, taustavalvonta, sähköpostit, maksut ja kirjautuminen kuuluvat myöhempään vaiheeseen.

## Käynnistys Windowsissa

Tarvitset Node.js:n ja sen mukana tulevan npm:n. Testien suorittamiseen tarvitaan Node.js 22.18 tai uudempi. Tarkista versiot PowerShellissä:

```powershell
node --version
npm.cmd --version
```

Asenna riippuvuudet projektin juuressa ja käynnistä kehityspalvelin:

```powershell
cd C:\Users\panuk\OneDrive\Golf
npm.cmd install
npm.cmd run dev
```

Avaa selaimessa **http://localhost:5173**. Palvelin varaa portin 5173; jos portti on käytössä, pysäytä sitä käyttävä palvelin ja suorita käynnistyskomento uudelleen. Pysäytä Golfvahdin palvelin terminaalissa painamalla `Ctrl+C`.

Windowsin `npm.cmd` toimii myös silloin, kun PowerShellin suorituskäytäntö estää `npm.ps1`-tiedoston käytön. Muissa ympäristöissä voit käyttää samoissa komennoissa `npm`-komentoa.

## Demon kokeileminen

1. Avaa **Lähtöaikojen haku**. Valitse alue tai golfkenttä, pelipäivä, aikaväli, pelaajamäärä ja enimmäishinta. Hae lähtöajat. Hakutuloksissa näkyvät kenttä, päivä, kellonaika, hinta per pelaaja ja vapaat paikat.
2. Paina **Tallenna vahdiksi**, anna vahdille nimi ja paina **Tallenna vahti**. **Omat vahdit** näyttää tallennetut ehdot ja niitä vastaavat lähtöajat. Voit muokata ja poistaa vahteja kortin kuvakepainikkeilla.
3. Kokeile ilmoitusta seuraavan päivän vahdilla: kaikki alueet, aikaväli 08.00–20.00, neljä pelaajaa ja enimmäishinta 150 euroa. Paina **Hae lähtöaikoja** ja tallenna vahti.
4. Avaa **Kentän demo**. Valitse **Simuloi peruutus** -osiosta seuraavan päivän kello 18.30 lähtö, joka on esimerkkitiedoissa aluksi täynnä. Valitse neljä vapautettavaa paikkaa ja paina **Vapauta lähtöpaikkoja**. Vahti saa uuden osuman. Avaa näkyvä ilmoitusbanneri tai yläpalkin kellokuvake nähdäksesi ilmoituksen.
5. Lisää Kentän demon lomakkeella samalle seuraavalle päivälle uusi lähtöaika, esimerkiksi kello 14.30, neljä vapaata paikkaa ja hinta 45 euroa. Paina **Lisää lähtöaika**. Se ilmestyy heti hakutuloksiin ja vahdin osumiin. Päivitä sivu: vahdit, lisätyt ajat ja vapautetut paikat säilyvät.

Hakutulokset päivittyvät demon muutosten jälkeen. Ilmoitus syntyy, kun lähtö alkaa täyttää olemassa olevan vahdin ehtoja; saman jo sopivan lähdön paikkamäärän kasvu ei tuota uutta ilmoitusta.

## Päivät ja tallennus

Demossa on neljä kuvitteellista kenttää ja lähtöajat Suomen tämän päivän sekä kuuden seuraavan päivän ajalle. Päivämäärät ja kellonajat käsitellään `Europe/Helsinki`-aikavyöhykkeessä, myös kesäaikana. Peruslähtöajat luodaan päivän mukaan, joten demo ei jää kiinni kehityshetken päivämäärään.

Vahdit ja demon muutokset tallennetaan selaimen `localStorage`-muistiin. Tiedot kuuluvat selaimelle ja verkkosivun osoitteelle: toinen selain, yksityinen selausikkuna tai eri portti käyttää eri tallennusta. Voit aloittaa alusta tyhjentämällä tämän sivun sivustotiedot selaimen asetuksista. Jos selain estää tallennuksen, sovellus kertoo siitä eikä tietojen säilymiseen sivun päivityksen jälkeen voi luottaa.

## Tarkistukset ja tuotantokooste

```powershell
npm.cmd run typecheck
npm.cmd test
npm.cmd run build
```

`typecheck` tarkistaa TypeScriptin. Testit tarkistavat muun muassa Suomen päivämäärärajat, hakuehdot, uusien osumien ilmoitukset ja tallennuksen. `build` tekee tyyppitarkistuksen ja tuottaa staattisen sovelluksen `dist`-kansioon.

Voit kokeilla koottua sovellusta paikallisesti:

```powershell
npm.cmd run preview
```

Avaa **http://localhost:4173**. Preview on paikallinen kooste-esikatselu; sovellus ei tarvitse palvelinpuolen tietokantaa tai rajapintaa.

## Rakenne

- `src/App.tsx`: näkymät, sovelluksen tila ja käyttäjän toiminnot.
- `src/components/`: uudelleenkäytettävä hakulomake, lähtöaikakortti ja kuvakkeet.
- `src/lib/golf.ts`: kentät, päivämäärät, lähtöaikojen haku, ilmoitukset ja tallennus.
- `src/styles.css`: sovelluksen ulkoasu ja mukautuminen puhelimelle sekä tietokoneelle.
- `tests/domain.test.ts`: sovelluslogiikan testit Node.js:n omalla testityökalulla.
- `package.json`: riippuvuudet ja käynnistys-, tarkistus- sekä koontikomennot.

Tekniikat: React, TypeScript, Vite ja tavallinen CSS.
