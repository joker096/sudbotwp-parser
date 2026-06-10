const fs = require('fs');

const data = JSON.parse(fs.readFileSync('generated-posts/zashchita-prav-potrebiteley-v-sude.json', 'utf8'));

const expandedPart = `
<h2>Osobennosti rassmotreniya potrebitelskikh sporov v sude</h2>
<p>Sudebnoe razbiratelstvo po potrebitelskim iskam imeet ryad protsessualnykh osobennostey, kotorye neobkhodimo uchityvat pri podgotovke i podache iska. Vo-pervykh, dela dannoy kategorii rassmatrivayutsya mirovymi sudiyami pri tsene iska do 100 000 rubley i rayonnymi sudami pri tsene svyshe 100 000 rubley. Odnako esli naryadu s imushchestvennymi zayavleny neimushchestvennye trebovaniya (kompensatsiya moralnogo vreda), podsudnost opredelyaetsya po imushchestvennym trebovaniyam, a moralnyy vred ne uchityvaetsya.</p>
<p>Vo-vtorykh, po obshchemu pravilu dela o zashchite prav potrebiteley rassmatrivayutsya v techenie dvukh mesyatsev so dnya postupleniya zayavleniya. Odnako na praktike sroki chasto zatyagivayutsya iz-za neobkhodimosti provedeniya ekspertizy, vyzova svideteley, istrebovaniya dokazatelstv. Rekomenduetsya zarance podgotovit vse vozmozhnye pismennye dokazatelstva i khodataystvovat ob ikh priobshchenii k delu na stadii podgotovki.</p>
<p>V-tretikh, v potrebitelskikh sporakh shiroko primenyaetsya institut protsessualnogo souchastiya. Esli odin i tot zhe prodavets narushil prava neskolkikh potrebiteley (naprimer, prodal partiyu brakovannogo tovara), kazhdyy iz nikh vprave podat samostoyatelnyy isk ili prisoedinitsya k kollektivnomu isku. Zakon o zashchite prav potrebiteley predusmatrivaet vozmozhnost podachi gruppovykh iskov cherez obshchestvennye obedineniya potrebiteley, chto sushchestvenno ekonomit vremya i sredstva.</p>

<h3>Uchastie prokurora i obshchestvennykh organizatsiy</h3>
<p>Prokuror vprave obratitsya v sud v zashchitu prav neopredelyonnogo kruga potrebiteley ili konkretnogo potrebitelya, esli on ne mozhet samostoyatelno zashchitit svoi prava po sostoyaniyu zdorovya, vozrastu, nedeesposobnosti ili inym uvazhitelnym prichinam. Obshchestvennye obedineniya potrebiteley takzhe nadeleny pravom obrashchatsya v sud v zashchitu prav potrebiteley. Eto osobenno aktualno dlya sotsialno znachimykh kategoriy del — obespechenie lekarstvami, uslugami ZhKKh, meditsinskimi uslugami.</p>

<h3>Obespechitelnye mery</h3>
<p>Zakon ne ogranichivaet potrebitelya v prave khodataystvovat o prinyatii obespechitelnykh mer. Naibolee effektivnye mery: arest imushchestva otvetchika, zapret sovershat opredelyonnye deystviya, priostanovlenie vzyskaniya po ispolnitelnomu listu. Obespechitelnye mery osobenno aktualny v delakh o dorogostoyashchikh tovarakh i uslugakh, kogda sushchestvuet risk, chto otvetchik skroet imushchestvo ili denezhnye sredstva do vyneseniya resheniya. Zayavlenie ob obespechenii iska podaetsya odnovremenno s iskom ili v protsesse rassmotreniya dela.</p>

<h2>Ispolnenie resheniya suda po potrebitelskomu isku</h2>
<p>Poluchenie resheniya suda na rukakh — tolko poldela. Dalee neobkhodimo dozhdatsya ego vstupleniya v zakonnuyu silu (odin mesyats, esli ne podana apellyatsionnaya zhaloba) i poluchit ispolnitelnyy list. Ispolnitelnyy list vydaetsya sudom pervoy instantsii po zayavleniyu vzyskatelya. Esli otvetchik ne ispolnyaet reshenie dobrovolno, ispolnitelnyy list predyavlyaetsya v sluzhbu sudebnykh pristavov po mestu ego nakhozhdeniya ili imushchestva.</p>
<p>Protsedura prinuditelnogo ispolneniya vklyuchaet: vozbuzhdenie ispolnitelnogo proizvodstva, napravlenie zaprosov v banki i registriruyushchie organy, arest schetov i imushchestva, realizatsiyu arestovannogo imushchestva s torgov, ogranichenie vyezda dolzhnika za granitsu. Srok dobrovolnogo ispolneniya sostavlyaet 5 dney. Esli dolzhnik ne ispolnil trebovaniya v etot srok, pristav vzyskivaet ispolnitelskiy sbor 7 protsentov ot summy dolga. Vzyskatel vprave trebovat takzhe indeksatsii prisuzhdyonnykh summ s uchyotom inflyatsii.</p>
<p>Na praktike krupnye prodavtsy i ispolniteli uslug ispolnyayut resheniya suda posle pervogo zhe preduprezhdeniya pristava ob areste schetov. Melkie prodavtsy i IP chasto uklonyayutsya ot ispolneniya: zakryvayut scheta, pereregistriruyut imushchestvo, prekrashchayut deyatelnost. V takikh sluchayakh vzyskanie stanovitsya problematichnym, i potrebitelyu ostaetsya tolko rasschityvat na rozysk imushchestva dolzhnika sluzhboy pristavov. Poetomu pered podachey iska stoit otsenit platezhesosobnost otvetchika — ne nakhoditsya li on v stadii likvidatsii, ne imeet li massu nepogashennykh dolgov.</p>

<h2>Raschyot neustoyki: primery i podvodnye kamni</h2>
<p>Pravilnyy raschyot neustoyki — odna iz samykh vazhnykh chastey iska. Oshibka v raschyote mozhet privesti k tomu, chto sud snizit summu neustoyki po statye 333 GK RF, dazhe esli vashe trebovanie obosnovanno. Razberem na konkretnykh primerakh, kak rasschitat neustoyku i kakie podvodnye kamni sushchestvuyut.</p>
<p>Dlya tovara: neustoyka 1 protsent ot tseny tovara za kazhdyy den prosrochki. Primer: vy kupili kholodilnik za 60 000 rubley, obnaruzhili brak, podali pretenziyu 1 fevralya. Prodavets dolzhen udovletvorit trebovanie do 11 fevralya (10 dney). Esli on ne sdelal etogo, s 12 fevralya nachinaet kakpitsya neustoyka na 60 000 rubley: 600 rubley v den. Na 30 aprelya (79 dney prosrochki) neustoyka sostavit 600 x 79 = 47 400 rubley. No neustoyka ne mozhet prevyshat tsenu tovara (60 000 rubley). Poetomu esli prosrochka bolshe, neustoyka vse ravno budet 60 000 rubley.</p>
<p>Dlya uslug: neustoyka 3 protsenta za kazhdyy den. Primer: remontnaya masterskaya ne vernula telefon cherez 45 dney. Stoimost remonta — 15 000 rubley. Neustoyka: 3 protsenta ot 15 000 = 450 rubley v den. Za 45 dney prosrochki: 450 x 45 = 20 250 rubley, no neustoyka ne mozhet prevyshat tsenu uslugi, to est 15 000 rubley.</p>
<p>Dlya predoplachennykh tovarov: neustoyka 0,5 protsenta ot summy predoplaty za kazhdyy den prosrochki. Primer: vy zaplatiili za shkaf 120 000 rubley, prodavets dolzhen dostavit ego cherez 30 dney. Prosrochka sostavila 60 dney. Neustoyka: 0,5 protsenta ot 120 000 = 600 rubley v den. Za 60 dney: 600 x 60 = 36 000 rubley. Zdes neustoyka ne ogranichena tsenoy tovara.</p>
<p>Vazhno: sud mozhet snizit neustoyku po statye 333 GK RF, yesli poschitayot eyo nesoosrazmernoy. Naibolee chasto snizhayut neustoyku po uslugam (3 protsenta v den — eto bolee 1000 protsentov godovykh). Chtoby predotvratit snizhenie, rekomenduetsya privesti raschyot neustoyki v iske i obosnovat eyo sootvetstvie posledstviyam narusheniya. Sudy redko snizhayut neustoyku po potrebitelskim iskam, esli otvetchik ne predstavil dokazatelstv eyo nesoosrasmernosti.</p>

<div class="cta-box">
<p><strong>Nuzhna konsultatsiya po vashemu sluchayu?</strong></p>
<p>Ostavte zayavku, i nash yurist svyazhetsya s vami v techenie chasa.</p>
<a href="/contact" class="cta-button" style="display:inline-flex;align-items:center;justify-content:center;min-width:48px;min-height:48px;padding:12px 24px;background:linear-gradient(135deg,#8b5cf6,#7c3aed);color:white;font-weight:600;text-decoration:none;border-radius:12px;font-size:14px;margin-top:8px;">Svyazatsya</a>
</div>
`;

const faqIndex = data.content.lastIndexOf('<h2>FAQ</h2>');
data.content = data.content.substring(0, faqIndex) + expandedPart + data.content.substring(faqIndex);

fs.writeFileSync('generated-posts/zashchita-prav-potrebiteley-v-sude.json', JSON.stringify(data, null, 2), 'utf8');

const text = data.content.replace(/<[^>]+>/g, ' ');
const words = text.split(/\s+/).filter(Boolean).length;
console.log('Article 6 expanded:', words, 'words');
