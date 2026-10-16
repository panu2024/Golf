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

Avaa selaimessa **http://localhost:5173/Golf/**. Palvelin varaa portin 5173; jos portti on käytössä, pysäytä sitä käyttävä palvelin ja suorita käynnistyskomento uudelleen. Pysäytä Golfvahdin palvelin terminaalissa painamalla `Ctrl+C`.

Windowsin `npm.cmd` toimii myös silloin, kun PowerShellin suorituskäytäntö estää `npm.ps1`-tiedoston käytön. Muissa ympäristöissä voit käyttää samoissa komennoissa `npm`-komentoa.

## Demon kokeileminen

1. Avaa yläreunan **Haku**. Valitse alue tai golfkenttä, pelipäivä ja pelaajamäärä. Avaa tarvittaessa **Lisäehdot**, jos haluat muuttaa aikaväliä tai enimmäishintaa. Käytössä oleva aikaväli ja hintaraja näkyvät myös lisäehtojen ollessa suljettuna. Paina **Hae lähtöaikoja**. Hakutuloksissa näkyvät kenttä, päivä, kellonaika, hinta per pelaaja ja vapaat paikat.
2. Paina hakutulosten yhteydessä **Tallenna vahti**, anna vahdille nimi ja vahvista lomakkeen **Tallenna vahti** -painikkeella. **Omat vahdit** näyttää tallennetut ehdot ja niitä vastaavat lähtöajat. Voit muokata ja poistaa vahteja kortin kuvakepainikkeilla.
3. Kokeile ilmoitusta seuraavan päivän vahdilla: kaikki alueet, neljä pelaajaa sekä **Lisäehdot**-kohdasta aikaväli 08.00–20.00 ja enimmäishinta 150 euroa. Paina **Hae lähtöaikoja** ja tallenna vahti hakutulosten yhteydestä.
4. Avaa **Valikko → Kentän demo**. Valitse **Simuloi peruutus** -osiosta seuraavan päivän kello 18.30 lähtö, joka on esimerkkitiedoissa aluksi täynnä. Valitse neljä vapautettavaa paikkaa ja paina **Vapauta lähtöpaikkoja**. Vahti saa uuden osuman. Avaa näkyvä ilmoitusbanneri tai yläpalkin kellokuvake nähdäksesi ilmoituksen.
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

Avaa **http://localhost:4173/Golf/**. Preview on paikallinen kooste-esikatselu; sovellus ei tarvitse palvelinpuolen tietokantaa tai rajapintaa.

## Julkaiseminen GitHub Pagesiin

Julkaisu on valmisteltu repositoriolle [panu2024/Golf](https://github.com/panu2024/Golf). Viten `base` on `/Golf/`, joten JavaScript, CSS ja kuvakkeet latautuvat repositorion omasta polusta. Käytä isoa G-kirjainta myös osoitteessa. Sovelluksen kolme näkymää vaihtuvat Reactin tilassa ilman erillisiä URL-polkuja, joten sivun päivitys osoitteessa `/Golf/` toimii ilman palvelimen reititysasetuksia.

### GitHubin asetukset

1. Avaa repositorion **Settings → Pages**.
2. Valitse **Build and deployment → Source → GitHub Actions**. Projektissa on valmis työnkulku; GitHubin tarjoamaa mallia ei tarvitse lisätä.
3. Jos Actions on poistettu käytöstä, salli työnkulkujen suorittaminen kohdassa **Settings → Actions → General**. Työnkulku käyttää GitHubin omia `actions/*`-toimintoja.

Ohje perustuu [GitHubin julkaisuasetusten dokumentaatioon](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site). Repositorion yksityisyysasetusta ei muuteta. Jos repo on yksityinen eikä Pages ole käytettävissä, tarkista tilauksen tuki: yksityisen repositorion Pages-julkaisu vaatii GitHub Pro-, Team- tai Enterprise-tilauksen. Julkisen repositorion Pages kuuluu myös Free-tilaukseen.

### Muutosten tallentaminen ja lähettäminen

Suorita PowerShellissä projektin juuressa:

```powershell
cd C:\Users\panuk\OneDrive\Golf
git status
git add vite.config.ts index.html .github/workflows/deploy-pages.yml README.md
git commit -m "Valmistele Golfvahti GitHub Pagesiin"
git push origin main
```

`git status` näyttää tallennettavat muutokset ennen commitia. `git add` lisää juuri julkaisua varten muutetut tiedostot. Lähetys `main`-haaraan käynnistää julkaisun automaattisesti.

### Julkaisun seuraaminen ja käynnistäminen käsin

Avaa repositorion **Actions** ja valitse **Deploy Golfvahti to GitHub Pages**. Näet työnkulun etenemisen ja mahdolliset virheet sen lokista. Käsin käynnistäminen onnistuu samasta näkymästä valitsemalla **Run workflow → Branch: main → Run workflow**, kun työnkulku on ensin lähetetty GitHubiin.

Työnkulku asentaa riippuvuudet komennolla `npm ci`, joka käyttää `package-lock.json`-tiedostoon lukittuja versioita. Se suorittaa logiikkatestit ja `npm run build` -komennon, jonka alkuun kuuluu tyyppitarkistus. Onnistuneen koonnin jälkeen työnkulku lataa `dist`-kansion julkaisua varten ja julkaisee sen GitHub Pagesiin. `dist`-kansiota ei tarvitse tallentaa Gitiin eikä erillistä `gh-pages`-haaraa luoda.

Onnistuneen julkaisun jälkeen sivun oletusosoite on **https://panu2024.github.io/Golf/**. Avaa osoite vasta, kun Actions näyttää julkaisun onnistuneen. GitHubissa tapahtuva julkaisu ja sen lopullinen osoite varmistetaan ensimmäisellä työnkulun suorituksella; paikallinen build ei yksin vahvista palvelussa tehtyä julkaisua.

Pagesissa sovellus toimii edelleen paikallisena demona: vahdit ja demon muutokset tallentuvat käyttäjän selaimeen. Paikallisen kehitysosoitteen tallennukset eivät siirry GitHub Pagesin osoitteeseen. Ilmoitukset toimivat vain avoimessa sovelluksessa.

## Rakenne

- `src/App.tsx`: näkymät, sovelluksen tila ja käyttäjän toiminnot.
- `src/components/`: uudelleenkäytettävä hakulomake lisäehtoineen, lähtöaikarivi ja kuvakkeet.
- `src/lib/golf.ts`: kentät, päivämäärät, lähtöaikojen haku, ilmoitukset ja tallennus.
- `src/styles.css`: sovelluksen ulkoasu ja mukautuminen puhelimelle sekä tietokoneelle.
- `tests/domain.test.ts`: sovelluslogiikan testit Node.js:n omalla testityökalulla.
- `package.json`: riippuvuudet ja käynnistys-, tarkistus- sekä koontikomennot.
- `vite.config.ts`: kehityspalvelimen asetukset ja GitHub Pagesin `/Golf/`-polku.
- `.github/workflows/deploy-pages.yml`: automaattinen koonti ja julkaisu GitHub Pagesiin.

Tekniikat: React, TypeScript, Vite ja tavallinen CSS.
