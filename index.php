<?php
// Sökvägen måste vara relativ till index.php
require_once('api/auth_check.php');
?>
<!DOCTYPE html>
<html lang="sv">

<head>
	<meta charset="utf-8" />
	<meta content="width=device-width, initial-scale=1.0" name="viewport" />
	<title>Godman Dashboard (Fullt Integrerad v2)</title>
	<link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;700&display=swap" rel="stylesheet">
	<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css" xintegrity="sha512-Fo3rlrZj/k7ujTnHg4CGR2D7kSs0v4LLanw2qksYuRlEzO+tcaEPQogQ0KaoGN26/zrn20ImR1DfuLWnOo7aBA==" crossorigin="anonymous" referrerpolicy="no-referrer" />
	<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/choices.js/public/assets/styles/choices.min.css" />
	<link rel="stylesheet" href="style.css">
</head>

<body>
	<div class="app-container">
		<header class="top-nav">
			<div class="logo-area">
				<button id="toggleSideNavMobile" class="toggle-side-nav-btn-mobile" title="Växla meny"><i class="fas fa-bars"></i></button>
				<img src="god_man_super_man.webp" alt="God Man Logo" class="logo-img">
			</div>
			<div class="header-main-title">
				<h1>Godman App</h1>
			</div>
			<div class="user-actions">
				<i class="fas fa-search" title="Sök (framtida)"></i>
				<i class="fas fa-bell" title="Notiser (framtida)"></i>
				<div class="user-profile-icon" title="Användarprofil (framtida)">GM</div>
			</div>
		</header>

		<div class="main-layout">
			<aside class="side-nav">
				<nav>
					<ul>

						<li class="nav-item" data-tab="tab-huvudman"><a href="#"><i class="fas fa-users"></i><span>Huvudmän</span></a></li>
						<li class="nav-item" data-tab="tab-arsrakning"><a href="#"><i class="fas fa-file-invoice-dollar"></i><span>Årsräkning</span></a></li>
						<li class="nav-item" data-tab="tab-redogorelse"><a href="#"><i class="fas fa-file-alt"></i><span>Redogörelse</span></a></li>
						<li class="nav-item" data-tab="tab-forsorjningsstod"><a href="#"><i class="fas fa-hand-holding-usd"></i><span>Försörjningsstöd</span></a></li>
						<li class="nav-item" data-tab="tab-arvode"><a href="#"><i class="fas fa-calculator"></i><span>Arvode</span></a></li>
						<li class="nav-item" data-tab="tab-fakturor"><a href="#"><i class="fas fa-file-invoice"></i><span>Betala Fakturor</span></a></li>
						<li class="nav-item" data-tab="tab-lankar"><a href="#"><i class="fas fa-link"></i><span>Länkar</span></a></li>
						<li class="nav-item" data-tab="tab-brev"><a href="#"><i class="fas fa-envelope"></i><span>Brev</span></a></li>
						<li class="nav-item" data-tab="tab-godman-profiler"><a href="#"><i class="fas fa-user-shield"></i><span>Mina Profiler</span></a></li>
						<li class="nav-item" data-tab="tab-nordea-auto"><a href="#"><i class="fas fa-robot"></i><span>Nordea Auto</span></a></li>
						<li class="nav-item" data-tab="tab-pdf-templates"><a href="#"><i class="fas fa-link"></i><span>PDF-mallar</span></a></li>
						<li class="nav-item" data-tab="tab-generator"><a href="#"><i class="fas fa-file-import"></i><span>Dokumentgenerator</span></a></li>
						<li class="nav-item" data-tab="tab-arkiv"><a href="#"><i class="fas fa-archive"></i><span>Dokumentarkiv</span></a></li>
						<li class="nav-item" data-tab="tab-help"><a href="#"><i class="fas fa-question-circle"></i><span>Hjälp &amp; Guider</span></a></li>

					</ul>
				</nav>
				<button id="toggleSideNavDesktop" class="toggle-side-nav-btn-desktop" title="Växla meny"><i class="fas fa-chevron-left"></i></button>
			</aside>

			<main class="content-area">

				<div class="tab-content active" id="tab-huvudman">
					<div class="sub-header-bar" id="huvudmanActionSubHeader">
						<div class="sub-header-info">
							Vald huvudman: <span id="subHeaderHuvudmanName"></span> (<span id="subHeaderHuvudmanPnr"></span>)
						</div>
						<div class="section-links-dropdown-container">
							<button id="toggleSectionLinksDropdownBtn" aria-haspopup="true" aria-expanded="false">
								<i class="fas fa-anchor"></i> Gå till sektion
							</button>
							<div class="section-links-dropdown-content" id="sectionLinksDropdownContent">
							</div>
						</div>
						<div class="sub-header-actions">
							<button id="saveHuvudmanDetailsBtn" class="small"><i class="fas fa-save"></i> Spara ändringar</button>
							<button id="refreshHuvudmanDetailsBtn" class="small secondary"><i class="fas fa-sync-alt"></i> Ladda om</button>
						</div>
					</div>
					<div class="box">
					</div>


					<div class="box" id="huvudman-top">
						<div class="row">
							<div class="kpi-container">
								<div class="kpi-box">
									<span class="kpi-value" id="huvudman-count-display">0</span>
									<span class="kpi-label">Visade Huvudmän</span>
								</div>
								<div class="kpi-box-action">
									<button id="export-huvudman-excel-btn" class="small secondary">
										<i class="fas fa-file-excel"></i> Exportera till Excel
									</button>
								</div>
							</div>
							<div class="row">
								<div class="col">
									<label>Filtrera vy (Överförmyndare)</label>
									<select id="huvudmanFilterOF"></select>
								</div>
								<div class="col">
									<label>Välj Huvudman</label>
									<div style="display: flex; align-items: center; gap: 10px;">
										<select id="huvudmanSelect" style="flex-grow: 1;">
											<option value="">Laddar data...</option>
										</select>
										<button onclick="nyHuvudman()" class="small" title="Lägg till ny huvudman">
											<i class="fas fa-plus"></i> Ny Huvudman
										</button>
									</div>
								</div>
							</div>
						</div>

						<div id="huvudman-dashboard-content" class="box">
							<div class="muted">Laddar data, vänligen vänta...</div>
						</div>

						<div class="box" id="huvudmanDetailsContainer" style="display:none;">
							<form id="huvudmanDetailsForm">
								<div class="collapsible-section" id="section-grunduppgifter">
									<h2>
										Detaljer för
										<span id="huvudmanNameDisplay"></span>
										(<span id="huvudmanPnrDisplay"></span>)
									</h2>
									<p>
										<small>
											OBS: Årsräkningsperioden på "Årsräkning & Förteckning"-fliken bestämmer vilket års data som visas/sparas för årsräkningslistor.
											Generella listor (bankkonton, tillgångar, skulder) är inte årsspecifika. Förordnandedatum används för Förteckning.
										</small>
									</p>

									<div class="collapsible-sections-container">

										<div class="collapsible-section" id="section-grunduppgifter">
											<h3 class="collapsible-header">Grunduppgifter & Kontakt <span class="toggler">▼</span></h3>
											<div class="collapsible-content">
												<div class="form-grid">
													<div class="form-column">
														<div class="input-group"><label for="personnummer">Personnummer:</label><input type="text" id="personnummer" disabled /></div>
														<div class="input-group"><label for="fornamn">Förnamn:</label><input type="text" id="fornamn" /></div>
														<div class="input-group"><label for="efternamn">Efternamn:</label><input type="text" id="efternamn" /></div>
														<div class="input-group"><label for="adress">Ordinarie Adress, LghNr:</label><input type="text" id="adress" /></div>
														<div class="input-group"><label for="postnummer">Ordinarie Postnummer:</label><input type="text" id="postnummer" /></div>
														<div class="input-group"><label for="ort">Ordinarie Postort:</label><input type="text" id="ort" /></div>
													</div>
													<div class="form-column">
														<div class="input-group"><label for="telefon">Telefonnummer (dagtid):</label><input type="text" id="telefon" /></div>
														<div class="input-group"><label for="mobil">Mobilnummer:</label><input type="text" id="mobil" /></div>
														<div class="input-group"><label for="epost">E-postadress:</label><input type="email" id="epost" /></div>
														<div class="input-group"><label for="medborgarskap">Medborgarskap:</label><input type="text" id="medborgarskap" /></div>
														<div class="input-group">
															<label for="civilstand">Civilstånd:</label>
															<select id="civilstand">
																<option value="">-- Välj --</option>
																<option value="Ensamstående">Ensamstående</option>
																<option value="Gift">Gift</option>
																<option value="Sambo">Sambo</option>
																<option value="Registrerad partner">Registrerad partner</option>
																<option value="Änka/änkling">Änka/änkling</option>
																<option value="Skild">Skild</option>
																<option value="Ogift">Ogift</option>
															</select>
														</div>
														<div class="input-group">
															<label for="sammanboende">Sammanboende:</label>
															<select id="sammanboende" onchange="toggleMedsokandeSection()">
																<option value="">-- Välj --</option>
																<option value="1">Ja</option>
																<option value="0">Nej</option>
															</select>
														</div>
														<div class="input-group"><label for="forordnandeDatum">Förordnandedatum (God man):</label><input type="date" id="forordnandeDatum" /></div>
														<div class="input-group"><label for="saldoRakningskontoForordnande">Saldo Räkningskonto (på förordnandedagen):</label><input type="number" step="0.01" id="saldoRakningskontoForordnande" placeholder="0,00" /></div>
													</div>
												</div>
												<div style="text-align:right;margin-top:15px;">
													<button type="button" class="small secondary close-section-bottom-btn">Stäng Grunduppgifter</button>
												</div>
											</div>
										</div>
										<hr>

										<div class="collapsible-section" id="section-medsokande" style="display:none;">
											<h3 class="collapsible-header">Medsökande <span class="toggler">▼</span></h3>
											<div class="collapsible-content">
												<div class="form-grid">
													<div class="form-column">
														<div class="input-group"><label for="medsokandeFornamn">Medsökandes Förnamn:</label><input type="text" id="medsokandeFornamn" /></div>
														<div class="input-group"><label for="medsokandeEfternamn">Medsökandes Efternamn:</label><input type="text" id="medsokandeEfternamn" /></div>
														<div class="input-group"><label for="medsokandePersonnummer">Medsökandes Personnummer:</label><input type="text" id="medsokandePersonnummer" /></div>
													</div>
													<div class="form-column">
														<div class="input-group"><label for="medsokandeMedborgarskap">Medsökandes Medborgarskap:</label><input type="text" id="medsokandeMedborgarskap" /></div>
														<div class="input-group">
															<label for="medsokandeCivilstand">Medsökandes Civilstånd:</label>
															<select id="medsokandeCivilstand">
																<option value="">-- Välj --</option>
																<option value="Gift">Gift</option>
																<option value="Sambo">Sambo</option>
																<option value="Registrerad partner">Registrerad partner</option>
																<option value="Ogift">Ogift</option>
															</select>
														</div>
														<div class="input-group"><label for="medsokandeSysselsattning">Medsökandes Sysselsättning:</label><input type="text" id="medsokandeSysselsattning" /></div>
													</div>
												</div>
												<div style="text-align:right;margin-top:15px;">
													<button type="button" class="small secondary close-section-bottom-btn">Stäng Medsökande</button>
												</div>
											</div>
										</div>
										<hr id="medsokandeHr" style="display:none;">

										<div class="collapsible-section" id="section-vistelse-bank">
											<h3 class="collapsible-header">Vistelse, Överförmyndare & Bank <span class="toggler">▼</span></h3>
											<div class="collapsible-content hidden-content">
												<div class="form-grid">
													<div class="form-column">
														<div class="input-group"><label for="vistelseadress">Vistelseadress (om annan):</label><input type="text" id="vistelseadress" /></div>
														<div class="input-group"><label for="vistelsepostnr">Vistelsepostnummer:</label><input type="text" id="vistelsepostnr" /></div>
														<div class="input-group"><label for="vistelseort">Vistelsepostort:</label><input type="text" id="vistelseort" /></div>
														<div class="input-group">
															<label for="overformyndareSelect">Överförmyndarenhet:</label>
															<div style="display:flex;align-items:center;gap:10px;">
																<select id="overformyndareSelect" style="flex-grow:1;"></select>
																<button type="button" class="small" id="btnNyOfn">Ny</button>
																<button type="button" class="small secondary" id="btnRedigeraOfn">Redigera vald</button>
															</div>
														</div>
													</div>
													<div class="form-column">
														<div class="input-group"><label for="banknamn">Bank (för räkningskonto):</label><input type="text" id="banknamn" /></div>
														<div class="input-group"><label for="clearingnummer">Clearingnr (räkningskonto):</label><input type="text" id="clearingnummer" /></div>
														<div class="input-group"><label for="kontonummer">Kontonr (räkningskonto):</label><input type="text" id="kontonummer" /></div>
													</div>
												</div>
												<div style="text-align:right;margin-top:15px;">
													<button type="button" class="small secondary close-section-bottom-btn">Stäng Vistelse, ÖF & Bank</button>
												</div>
											</div>
										</div>
										<hr>

										<div class="collapsible-section" id="section-boende-ekonomi">
											<h3 class="collapsible-header">Boende, Sysselsättning & Ekonomi (Generellt) <span class="toggler">▼</span></h3>
											<div class="collapsible-content hidden-content">
												<div class="form-grid">
													<div class="form-column">
														<h4>Boende</h4>
														<div class="input-group"><label for="boendeNamn">Boende (Namn/Specifik typ):</label><input type="text" id="boendeNamn" /></div>
														<div class="input-group">
															<label for="bostadTyp">Typ av boende (kategori):</label>
															<select id="bostadTyp">
																<option value="">-- Välj --</option>
																<option value="Hyresrätt">Hyresrätt</option>
																<option value="Bostadsrätt">Bostadsrätt</option>
																<option value="Eget hus/Villa">Eget hus/Villa</option>
																<option value="LSS-boende">LSS-boende</option>
																<option value="Särskilt boende (Äldreboende)">Särskilt boende (Äldreboende)</option>
																<option value="Andra hand">Andra hand</option>
																<option value="Inneboende">Inneboende</option>
																<option value="Annan">Annan</option>
															</select>
														</div>
														<div class="input-group"><label for="bostadAntalRum">Antal rum i bostad:</label><input type="number" id="bostadAntalRum" /></div>
														<div class="input-group"><label for="bostadAntalBoende">Antal boende i hushållet:</label><input type="number" id="bostadAntalBoende" /></div>
														<div class="input-group"><label for="bostadKontraktstid">Kontraktstid:</label><input type="text" id="bostadKontraktstid" /></div>
													</div>
													<div class="form-column">
														<h4>Sysselsättning & Ekonomi</h4>
														<div class="input-group"><label for="sysselsattning">Sysselsättning (beskrivning):</label><input type="text" id="sysselsattning" /></div>
														<div class="input-group"><label for="inkomsttyp">Inkomsttyp (huvudsaklig):</label><input type="text" id="inkomsttyp" /></div>
														<div class="input-group"><label for="deklareratStatus">Deklarerat (status/datum):</label><input type="text" id="deklareratStatus" /></div>
														<div class="input-group"><label for="arvodeUtbetaltStatus">Arvode Utbetalt till Stf:</label><select id="arvodeUtbetaltStatus">
																<option value="">-- Välj --</option>
																<option value="1">Ja</option>
																<option value="0">Nej</option>
															</select></div>
														<div class="input-group"><label for="merkostnadsersattningStatus">Merkostnadsersättning Utgår:</label><select id="merkostnadsersattningStatus">
																<option value="">-- Välj --</option>
																<option value="1">Ja</option>
																<option value="0">Nej</option>
															</select></div>
													</div>
												</div>
												<div style="text-align:right;margin-top:15px;">
													<button type="button" class="small secondary close-section-bottom-btn">Stäng Generella Uppgifter</button>
												</div>
											</div>
										</div>
										<hr>

										<div class="collapsible-section" id="section-ovriga-kontakter">
											<h3 class="collapsible-header">Övriga Kontakter & Statusar <span class="toggler">▼</span></h3>
											<div class="collapsible-content hidden-content">
												<div class="form-grid">
													<div class="form-column">
														<div class="input-group">
															<label for="ersattningAnnanMyndighetStatus">Ersättning/förmån från annan myndighet (väntas/erhålls):</label>
															<select id="ersattningAnnanMyndighetStatus" onchange="toggleErsattningFranFalt()">
																<option value="">-- Välj --</option>
																<option value="1">Ja</option>
																<option value="0">Nej</option>
															</select>
														</div>
														<div class="input-group" id="ersattningFranContainer" style="display:none;">
															<label for="ersattningAnnanMyndighetFran">Specificera från vilken myndighet/försäkringsbolag etc.:</label>
															<input type="text" id="ersattningAnnanMyndighetFran" />
														</div>
													</div>
													<div class="form-column">
														<div class="input-group">
															<label for="arsrOvrigaUpplysningar">Allmänna anteckningar / Övriga upplysningar:</label>
															<textarea id="arsrOvrigaUpplysningar" rows="4"></textarea>
														</div>
													</div>
												</div>
												<div style="text-align:right;margin-top:15px;">
													<button type="button" class="small secondary close-section-bottom-btn">Stäng Övr. Kontakter</button>
												</div>
											</div>
										</div>
										<hr>

										<div class="collapsible-section" id="section-kostnader-inkomster">
											<h3 class="collapsible-header">Generella Kostnader & Inkomster (Månadsvis) <span class="toggler">▼</span></h3>
											<div class="collapsible-content hidden-content">
												<p><small>Typiska månadsvärden. Används för att förifylla olika PDF-blanketter.</small></p>
												<div class="form-grid">

													<div class="form-column">
														<h4>Kostnader</h4>
														<div class="input-group"><label for="hyra">Hyra/Boendekostnad:</label><input type="number" step="0.01" id="hyra" /></div>
														<div class="input-group"><label for="elKostnad">Elkostnad:</label><input type="number" step="0.01" id="elKostnad" /></div>
														<div class="input-group"><label for="hemforsakring">Hemförsäkring:</label><input type="number" step="0.01" id="hemforsakring" /></div>
														<div class="input-group"><label for="reskostnader">Reskostnader (SL, Färdtjänst etc.):</label><input type="number" step="0.01" id="reskostnader" /></div>
														<div class="input-group"><label for="fackAvgiftAkassa">Fackavgift/A-kassa:</label><input type="number" step="0.01" id="fackAvgiftAkassa" /></div>
														<div class="input-group"><label for="medicinKostnad">Medicinkostnad:</label><input type="number" step="0.01" id="medicinKostnad" /></div>
														<div class="input-group"><label for="lakarvardskostnad">Läkarvårdskostnad:</label><input type="number" step="0.01" id="lakarvardskostnad" /></div>
														<div class="input-group"><label for="akutTandvardskostnad">Akut Tandvårdskostnad:</label><input type="number" step="0.01" id="akutTandvardskostnad" /></div>
														<div class="input-group"><label for="barnomsorgAvgift">Barnomsorgsavgift:</label><input type="number" step="0.01" id="barnomsorgAvgift" /></div>
														<div class="input-group"><label for="fardtjanstAvgift">Färdtjänstavgift:</label><input type="number" step="0.01" id="fardtjanstAvgift" /></div>
														<div class="input-group"><label for="bredband">Bredbandskostnad:</label><input type="number" step="0.01" id="bredband" /></div>
														<div class="input-group"><label for="ovrigKostnadBeskrivning">Övrig kostnad - Beskrivning:</label><input type="text" id="ovrigKostnadBeskrivning" /></div>
														<div class="input-group"><label for="ovrigKostnadBelopp">Övrig kostnad - Belopp:</label><input type="number" step="0.01" id="ovrigKostnadBelopp" /></div>
														<div class="form-column">
															<div class="input-group">
																<label for="handlaggare">Handläggare:</label>
																<input type="text" id="handlaggare" placeholder="Namn på handläggare">
															</div>
														</div>
													</div>

													<div class="form-column">
														<h4>Inkomster</h4>
														<div class="input-group"><label for="lon">Lön:</label><input type="number" step="0.01" id="lon" /></div>
														<div class="input-group"><label for="pensionLivrantaSjukAktivitet">Pension/Sjukers./Aktivitetsers.:</label><input type="number" step="0.01" id="pensionLivrantaSjukAktivitet" /></div>
														<div class="input-group"><label for="sjukpenningForaldrapenning">Sjukpenning/Föräldrapenning:</label><input type="number" step="0.01" id="sjukpenningForaldrapenning" /></div>
														<div class="input-group"><label for="arbetsloshetsersattning">Arbetslöshetsersättning:</label><input type="number" step="0.01" id="arbetsloshetsersattning" /></div>
														<div class="input-group"><label for="bostadsbidrag">Bostadsbidrag/Bostadstillägg:</label><input type="number" step="0.01" id="bostadsbidrag" /></div>
														<div class="input-group"><label for="barnbidragStudiebidrag">Barnbidrag/Studiebidrag:</label><input type="number" step="0.01" id="barnbidragStudiebidrag" /></div>
														<div class="input-group"><label for="underhallsstodEfterlevandepension">Underhållsstöd/Efterlevandepension:</label><input type="number" step="0.01" id="underhallsstodEfterlevandepension" /></div>
														<div class="input-group"><label for="etableringsersattning">Etableringsersättning:</label><input type="number" step="0.01" id="etableringsersattning" /></div>
														<div class="input-group"><label for="avtalsforsakringAfa">Avtalsförsäkring (AFA etc.):</label><input type="number" step="0.01" id="avtalsforsakringAfa" /></div>
														<div class="input-group"><label for="hyresintaktInneboende">Hyresintäkt (inneboende):</label><input type="number" step="0.01" id="hyresintaktInneboende" /></div>
														<div class="input-group"><label for="barnsInkomst">Barns Inkomst:</label><input type="number" step="0.01" id="barnsInkomst" /></div>
														<div class="input-group"><label for="skatteaterbaring">Skatteåterbäring:</label><input type="number" step="0.01" id="skatteaterbaring" /></div>
														<div class="input-group"><label for="studiemedel">Studiemedel (bidragsdel):</label><input type="number" step="0.01" id="studiemedel" /></div>
														<div class="input-group"><label for="vantadInkomstBeskrivning">Väntad inkomst - Beskrivning:</label><input type="text" id="vantadInkomstBeskrivning" /></div>
														<div class="input-group"><label for="vantadInkomstBelopp">Väntad inkomst - Belopp:</label><input type="number" step="0.01" id="vantadInkomstBelopp" /></div>
														<div class="input-group"><label for="ovrigInkomstBeskrivning">Övrig inkomst - Beskrivning:</label><input type="text" id="ovrigInkomstBeskrivning" /></div>
														<div class="input-group"><label for="ovrigInkomstBelopp">Övrig inkomst - Belopp:</label><input type="number" step="0.01" id="ovrigInkomstBelopp" /></div>
													</div>

												</div>
												<div style="text-align:right;margin-top:15px;">
													<button type="button" class="small secondary close-section-bottom-btn">Stäng Kostn. & Inkomst.</button>
												</div>
											</div>
										</div>
										<hr>

										<div class="collapsible-section" id="section-generella-tillgangar-skulder">
											<h3 class="collapsible-header">Generella Tillgångar & Skulder <span class="toggler">▼</span></h3>
											<div class="collapsible-content hidden-content">
												<div class="form-grid">
													<div class="form-column">
														<h4>Tillgångar (ungefärliga värden)</h4>
														<div class="input-group"><label for="tillgangBankmedelVarde">Bankmedel (totalt):</label><input type="number" step="0.01" id="tillgangBankmedelVarde" /></div>
														<div class="input-group"><label for="tillgangBostadsrattFastighetVarde">Bostadsrätt/Fastighet:</label><input type="number" step="0.01" id="tillgangBostadsrattFastighetVarde" /></div>
														<div class="input-group"><label for="tillgangFordonMmVarde">Fordon m.m.:</label><input type="number" step="0.01" id="tillgangFordonMmVarde" /></div>
													</div>
													<div class="form-column">
														<h4>Skulder (ungefärliga värden)</h4>
														<div class="input-group"><label for="skuldKfmVarde">Skuld KFM:</label><input type="number" step="0.01" id="skuldKfmVarde" /></div>
													</div>
												</div>
												<div style="text-align:right;margin-top:15px;">
													<button type="button" class="small secondary close-section-bottom-btn">Stäng Gen. Tillg. & Skuld.</button>
												</div>
											</div>
										</div>
										<hr>

										<div class="collapsible-section" id="section-bankkonton-start">
											<h3 class="collapsible-header">Bankkonton Periodens Början <span class="toggler">▼</span></h3>
											<div class="collapsible-content hidden-content">
												<p><small>Fyll i huvudmannens bankkonton och deras saldon. Saldot för räkningskontot hämtas normalt från kontoutdraget.</small></p>
												<div id="hmBankkontonStartContainer"></div>
												<button type="button" class="small" onclick="addBankkontoRow('Start', 'hmBankkontonStartContainer')">Lägg till Bankkonto (Start)</button>
												<div style="text-align:right;margin-top:15px;">
													<button type="button" class="small secondary close-section-bottom-btn">Stäng Bankkonton Start</button>
												</div>
											</div>
										</div>
										<hr>

										<div class="collapsible-section" id="section-bankkonton-slut">
											<h3 class="collapsible-header">Bankkonton Periodens Slut <span class="toggler">▼</span></h3>
											<div class="collapsible-content hidden-content">
												<p><small>Fyll i huvudmannens bankkonton och deras saldon. Saldot för räkningskontot hämtas normalt från kontoutdraget.</small></p>
												<div id="hmBankkontonSlutContainer"></div>
												<button type="button" class="small" onclick="addBankkontoRow('Slut', 'hmBankkontonSlutContainer')">Lägg till Bankkonto (Slut)</button>
												<div style="text-align:right;margin-top:15px;">
													<button type="button" class="small secondary close-section-bottom-btn">Stäng Bankkonton Slut</button>
												</div>
											</div>
										</div>
										<hr>

										<div class="collapsible-section" id="section-ovriga-tillgangar-start">
											<h3 class="collapsible-header">Övriga Tillgångar Periodens Början <span class="toggler">▼</span></h3>
											<div class="collapsible-content hidden-content">
												<p><small>Specificera övriga tillgångar som fonder, aktier, fastigheter etc.</small></p>
												<div id="hmOvrigaTillgangarStartContainer"></div>
												<button type="button" class="small" onclick="addOvrigTillgangRow('Start', 'hmOvrigaTillgangarStartContainer')">Lägg till Övrig Tillgång (Start)</button>
												<div style="text-align:right;margin-top:15px;">
													<button type="button" class="small secondary close-section-bottom-btn">Stäng Övr. Tillg. Start</button>
												</div>
											</div>
										</div>
										<hr>

										<div class="collapsible-section" id="section-ovriga-tillgangar-slut">
											<h3 class="collapsible-header">Övriga Tillgångar Periodens Slut <span class="toggler">▼</span></h3>
											<div class="collapsible-content hidden-content">
												<p><small>Specificera övriga tillgångar.</small></p>
												<div id="hmOvrigaTillgangarSlutContainer"></div>
												<button type="button" class="small" onclick="addOvrigTillgangRow('Slut', 'hmOvrigaTillgangarSlutContainer')">Lägg till Övrig Tillgång (Slut)</button>
												<div style="text-align:right;margin-top:15px;">
													<button type="button" class="small secondary close-section-bottom-btn">Stäng Övr. Tillg. Slut</button>
												</div>
											</div>
										</div>
										<hr>

										<div class="collapsible-section" id="section-skulder">
											<h3 class="collapsible-header">Skulder <span class="toggler">▼</span></h3>
											<div class="collapsible-content hidden-content">
												<p><small>Specificera huvudmannens skulder.</small></p>
												<div id="hmSkulderContainer"></div>
												<button type="button" class="small" onclick="addSkuldRow('hmSkulderContainer')">Lägg till Skuld</button>
												<div style="text-align:right;margin-top:15px;">
													<button type="button" class="small secondary close-section-bottom-btn">Stäng Skulder</button>
												</div>
											</div>
										</div>

									</div>
									<div id="huvudmanJsonDataDisplay" style="margin-top:20px;padding:10px;background-color:#f0f0f0;border:1px solid #ccc;display:none;">
										<h4>Rådata (för utveckling):</h4>
										<pre id="huvudmanJsonData" style="white-space:pre-wrap;word-wrap:break-word;max-height:400px;overflow-y:auto;"></pre>
									</div>
								</div>
								<div class="box">
									<h3><i class="fas fa-folder-open"></i> Dokument</h3>
									<table id="ov-dokument-lista-table" class="budget-table">
										<thead>
											<tr>
												<th>Dokument</th>
												<th>Åtgärder</th>
											</tr>
										</thead>
										<tbody>
											<tr>
												<td colspan="2" class="muted">Inga dokument.</td>
											</tr>
										</tbody>
									</table>
								</div>
							</form>
						</div>
					</div>
				</div>
				<div class="tab-content" id="tab-arsrakning">
					<div class="box">
						<h2>Skapa Årsräkning / Förteckning</h2>
						<p>Välj huvudman på "Huvudman"-fliken. För årsräkning, välj period och ladda kontoutdrag. För förteckning, se till att förordnandedatum är ifyllt på Huvudman-fliken.</p>
						<div class="input-group"> <label class="label-like">Typ av räkning:</label>
							<div class="radio-group"> <input type="radio" id="rakningTypAr_ars" name="rakningTyp_ars" value="arsrakning" checked> <label for="rakningTypAr_ars" class="inline-label">Årsräkning (förra året)</label> <input type="radio" id="rakningTypSlut_ars" name="rakningTyp_ars" value="slutrakning"> <label for="rakningTypSlut_ars" class="inline-label">Sluträkning (innevarande år)</label> </div>
						</div>
						<div class="input-group"> <label class="label-like">Redovisningsperiod (för Års-/Sluträkning):</label>
							<div><label for="periodStart_ars" style="font-weight:normal; display: inline-block; margin-right: 5px;">Startdatum:</label> <input id="periodStart_ars" type="date" style="width: auto;" /> <label for="periodSlut_ars" style="font-weight:normal; display: inline-block; margin-left: 15px; margin-right: 5px;">Slutdatum:</label> <input id="periodSlut_ars" type="date" style="width: auto;" /></div>
						</div>
						<hr style="margin: 15px 0;">
						<div class="input-group"> <label for="fileInput">Läs in kontoutdrag (CSV/XLSX) för Års-/Sluträkning:</label> <input id="fileInput" type="file" accept=".csv,.xlsx" /> </div>
					</div>
					<div class="box">
						<div class="collapsible-section" id="rulesCollapsibleSection">
							<h3 class="collapsible-header">Hantera Kategoriseringsregler <span class="toggler">▼</span></h3>
							<div class="collapsible-content hidden-content">
								<p>Dessa regler används för att automatiskt försöka kategorisera transaktioner från kontoutdraget. Regler med högre prioritet testas först.</p>
								<button onclick="openRuleModal()">Lägg till Ny Regel</button>
								<div style="overflow-x: auto; margin-top: 10px;">
									<table id="rulesTable">
										<thead>
											<tr>
												<th>Matchningstyp</th>
												<th>Matchningstext</th>
												<th>Kategori</th>
												<th>Prioritet</th>
												<th>Åtgärder</th>
											</tr>
										</thead>
										<tbody>
											<tr>
												<td colspan="5"><i>Laddar regler...</i></td>
											</tr>
										</tbody>
									</table>
								</div>
								<div style="text-align: right; margin-top: 15px;">
									<button type="button" class="small secondary close-section-bottom-btn">Stäng Regelhantering</button>
								</div>
							</div>
						</div>
					</div>
					<div id="reportSection" class="hidden">
						<div class="box" id="personInfo"></div>

						<div class="form-grid">

							<div class="form-column">
								<div class="box" id="balans">
								</div>
							</div>

							<div class="form-column">
								<div class="box" id="balanceChartContainer">
									<h3>Ekonomisk Översikt (Graf)</h3>

									<div class="form-grid">
										<div class="chart-wrapper">
											<h4>Inkomster</h4>
											<canvas id="incomeChart"></canvas>
										</div>
										<div class="chart-wrapper">
											<h4>Utgifter</h4>
											<canvas id="expenseChart"></canvas>
										</div>
									</div>

								</div>
							</div>

						</div>

						<div class="box" id="reviewBox">
							<h3>Granska och Justera Transaktioner (för Års-/Sluträkning)</h3>
							<div class="filter-container">
								<label for="kategoriFilter" style="margin-right: 5px;">Filtrera på kategori:</label>
								<select id="kategoriFilter" onchange="displayReviewTable()">
									<option value="alla">Visa alla</option>
									<option value="okategoriserat">Okategoriserade</option>
									<option value="justerbara">Justerbara Inkomster</option>
								</select>
							</div>
							<div id="reviewSection">
								<table id="reviewTable">
									<thead>
										<tr>
											<th>Datum</th>
											<th>Text</th>
											<th>Belopp</th>
											<th>Kategori (Ändra/Justera)</th>
										</tr>
									</thead>
									<tbody></tbody>
								</table>
							</div>
							<p id="transactionCount" style="margin-top: 10px; font-style: italic;"></p>
						</div>

						<div class="box" id="exportBoxArsrakning">
							<h3>Exportera Dokument</h3>
							<div class="input-group"><label for="arsrakningUndertecknadOrtDatum">Undertecknad Ort & Datum (för PDF-utskrifter):</label><input type="text" id="arsrakningUndertecknadOrtDatum" placeholder="T.ex. Järfälla ÅÅÅÅ-MM-DD" /></div>
							<button onclick="sparaArsrakningPDF_MedMall()">Exportera Års-/Sluträkning (PDF)</button>
							<button onclick="genereraForteckningPDF()">Generera Förteckning (PDF)</button>
							<button onclick="sparaExcelRapport()">Exportera Års-/Sluträkning (Excel)</button>
						</div>
					</div>
				</div>
				<div class="tab-content" id="tab-redogorelse">
					<div class="box">
						<h2>Skapa Redogörelse</h2>
						<p>Välj huvudman i menyn Huvudmän och period i menyn Årsräkning. Fyll sedan i uppgifterna nedan.
							<button id="btnSparaRedogorelse" class="primary-action" style="float: right; margin-left: 10px;">Spara Redogörelse-data</button>
							<button onclick="sparaRedogorelsePDF_FranGrund()" style="float: right;">Generera Redogörelse (PDF)</button>
						</p>
						<div style="clear:both; margin-bottom: 20px;"></div>

						<div class="collapsible-sections-container">
							<div class="collapsible-section" id="redog-section-grund">
								<h3 class="collapsible-header">1. Grunduppgifter & Period <span class="toggler">▼</span></h3>
								<div class="collapsible-content">
									<div class="form-grid">
										<div class="form-column">
											<div class="input-group">
												<label for="redogKalenderarStart">Kalenderår från och med:</label>
												<input type="date" id="redogKalenderarStart" name="redogKalenderarStart">
											</div>
											<div class="input-group">
												<label for="redogHuvudmanNamnDisplay">Huvudman Namn:</label>
												<input type="text" id="redogHuvudmanNamnDisplay" name="redogHuvudmanNamnDisplay" disabled>
											</div>
										</div>
										<div class="form-column">
											<div class="input-group">
												<label for="redogKalenderarSlut">Kalenderår till och med:</label>
												<input type="date" id="redogKalenderarSlut" name="redogKalenderarSlut">
											</div>
											<div class="input-group">
												<label for="redogHuvudmanPnrDisplay">Huvudman Personnummer:</label>
												<input type="text" id="redogHuvudmanPnrDisplay" name="redogHuvudmanPnrDisplay" disabled>
											</div>
										</div>
									</div>
									<div class="form-grid">
										<div class="form-column">
											<div class="input-group">
												<label for="redogGodManNamnDisplay">God Man/Förvaltare Namn:</label>
												<input type="text" id="redogGodManNamnDisplay" name="redogGodManNamnDisplay" disabled>
											</div>
											<div class="input-group">
												<label>Släktskap med huvudmannen:</label>
												<div>
													<input type="radio" id="redogSlaktskapNej" name="redogSlaktskap" value="Nej" checked><label for="redogSlaktskapNej" class="radio-label">Nej</label>
													<input type="radio" id="redogSlaktskapJa" name="redogSlaktskap" value="Ja"><label for="redogSlaktskapJa" class="radio-label">Ja</label>
												</div>
											</div>
										</div>
										<div class="form-column">
											<div class="input-group">
												<label for="redogGodManPnrDisplay">God Man/Förvaltare Personnummer:</label>
												<input type="text" id="redogGodManPnrDisplay" name="redogGodManPnrDisplay" disabled>
											</div>
											<div class="input-group">
												<label for="redogSlaktskapTyp">Typ av släktskap (om "Ja"):</label>
												<input type="text" id="redogSlaktskapTyp" name="redogSlaktskapTyp">
											</div>
										</div>
									</div>
								</div>
							</div>
							<hr>

							<div class="collapsible-section" id="redog-section-boendeform">
								<h3 class="collapsible-header">2. Huvudmannens boendeform <span class="toggler">▼</span></h3>
								<div class="collapsible-content">
									<div class="input-group">
										<div>
											<input type="radio" id="redogBoendeformEgenFastighet" name="redogBoendeform" value="Egen fastighet"><label for="redogBoendeformEgenFastighet" class="radio-label">Egen fastighet</label>
										</div>
										<div>
											<input type="radio" id="redogBoendeformHyresratt" name="redogBoendeform" value="Hyresrätt"><label for="redogBoendeformHyresratt" class="radio-label">Hyresrätt</label>
										</div>
										<div>
											<input type="radio" id="redogBoendeformBostadsratt" name="redogBoendeform" value="Bostadsrätt"><label for="redogBoendeformBostadsratt" class="radio-label">Bostadsrätt</label>
										</div>
										<div>
											<input type="radio" id="redogBoendeformSarskilt" name="redogBoendeform" value="Särskilt boende (äldre-/demensboende)"><label for="redogBoendeformSarskilt" class="radio-label">Särskilt boende (äldre-/demensboende)</label>
										</div>
										<div>
											<input type="radio" id="redogBoendeformLSS" name="redogBoendeform" value="Bostad med särskild service (grupp-/servicebostad enl LSS)"><label for="redogBoendeformLSS" class="radio-label">Bostad med särskild service (LSS)</label>
										</div>
										<div style="display: flex; align-items: center; margin-top: 5px;">
											<input type="radio" id="redogBoendeformAnnat" name="redogBoendeform" value="Annat"><label for="redogBoendeformAnnat" class="radio-label" style="margin-right: 5px;">Annat:</label>
											<input type="text" id="redogBoendeAnnatText" name="redogBoendeAnnatText" placeholder="Specificera annat boende" style="flex-grow: 1; margin-top:0; margin-bottom:0;">
										</div>
									</div>
								</div>
							</div>
							<hr>

							<div class="collapsible-section" id="redog-section-omfattning">
								<h3 class="collapsible-header">3. Uppdragets omfattning <span class="toggler">▼</span></h3>
								<div class="collapsible-content">
									<p><strong>Uppdraget att:</strong></p>
									<div class="input-group">
										<input type="checkbox" id="redogOmfBevakaRatt" name="redogOmfBevakaRatt" style="width:auto; margin-right: 5px;"><label for="redogOmfBevakaRatt" class="inline-label">Bevaka rätt</label>
									</div>
									<div class="input-group">
										<input type="checkbox" id="redogOmfForvaltaEgendom" name="redogOmfForvaltaEgendom" style="width:auto; margin-right: 5px;"><label for="redogOmfForvaltaEgendom" class="inline-label">Förvalta egendom</label>
									</div>
									<div class="input-group">
										<input type="checkbox" id="redogOmfSorjaForPerson" name="redogOmfSorjaForPerson" style="width:auto; margin-right: 5px;"><label for="redogOmfSorjaForPerson" class="inline-label">Sörja för person</label>
									</div>
									<hr>
									<div class="input-group">
										<label>Bedömer du att behov av fortsatt godmanskap föreligger?</label>
										<div>
											<input type="radio" id="redogBehovFortsattJa" name="redogBehovFortsatt" value="Ja"><label for="redogBehovFortsattJa" class="radio-label">Ja</label>
											<input type="radio" id="redogBehovFortsattNej" name="redogBehovFortsatt" value="Nej" checked><label for="redogBehovFortsattNej" class="radio-label">Nej</label>
										</div>
									</div>
									<div class="input-group">
										<label>Bedömer du att godmanskapet bör ha annan omfattning?</label>
										<div>
											<input type="radio" id="redogAnnanOmfattningJa" name="redogAnnanOmfattning" value="Ja"><label for="redogAnnanOmfattningJa" class="radio-label">Ja</label>
											<input type="radio" id="redogAnnanOmfattningNej" name="redogAnnanOmfattning" value="Nej" checked><label for="redogAnnanOmfattningNej" class="radio-label">Nej</label>
										</div>
									</div>
								</div>
							</div>
							<hr>

							<div class="collapsible-section" id="redog-section-ekonomiskafragor">
								<h3 class="collapsible-header">4. Ekonomiska frågor / Bevaka rätt / Sörja för person <span class="toggler">▼</span></h3>
								<div class="collapsible-content">
									<div class="input-group">
										<label>Har du ansökt om bostadsbidrag / -tillägg?</label>
										<div>
											<input type="radio" id="redogAnkBostadsbidragJa" name="redogAnkBostadsbidrag" value="Ja"><label for="redogAnkBostadsbidragJa" class="radio-label">Ja</label>
											<input type="radio" id="redogAnkBostadsbidragNej" name="redogAnkBostadsbidrag" value="Nej"><label for="redogAnkBostadsbidragNej" class="radio-label">Nej</label>
											<input type="radio" id="redogAnkBostadsbidragEjAktuellt" name="redogAnkBostadsbidrag" value="Ej aktuellt"><label for="redogAnkBostadsbidragEjAktuellt" class="radio-label">Ej aktuellt</label>
										</div>
										<input type="text" id="redogAnkBostadsbidragKommentar" name="redogAnkBostadsbidragKommentar" placeholder="Kommentar...">
									</div>
									<div class="input-group">
										<label>Har du ansökt om försörjningsstöd?</label>
										<div>
											<input type="radio" id="redogAnkForsorjningJa" name="redogAnkForsorjning" value="Ja"><label for="redogAnkForsorjningJa" class="radio-label">Ja</label>
											<input type="radio" id="redogAnkForsorjningNej" name="redogAnkForsorjning" value="Nej"><label for="redogAnkForsorjningNej" class="radio-label">Nej</label>
											<input type="radio" id="redogAnkForsorjningEjAktuellt" name="redogAnkForsorjning" value="Ej aktuellt"><label for="redogAnkForsorjningEjAktuellt" class="radio-label">Ej aktuellt</label>
										</div>
										<input type="text" id="redogAnkForsorjningKommentar" name="redogAnkForsorjningKommentar" placeholder="Kommentar...">
									</div>
									<div class="input-group">
										<label>Har du ansökt om handikappersättning?</label>
										<div>
											<input type="radio" id="redogAnkHandikappJa" name="redogAnkHandikapp" value="Ja"><label for="redogAnkHandikappJa" class="radio-label">Ja</label>
											<input type="radio" id="redogAnkHandikappNej" name="redogAnkHandikapp" value="Nej"><label for="redogAnkHandikappNej" class="radio-label">Nej</label>
											<input type="radio" id="redogAnkHandikappEjAktuellt" name="redogAnkHandikapp" value="Ej aktuellt"><label for="redogAnkHandikappEjAktuellt" class="radio-label">Ej aktuellt</label>
										</div>
										<input type="text" id="redogAnkHandikappKommentar" name="redogAnkHandikappKommentar" placeholder="Kommentar...">
									</div>
									<div class="input-group">
										<label>Har du ansökt om habiliteringsersättning?</label>
										<div>
											<input type="radio" id="redogAnkHabiliteringJa" name="redogAnkHabilitering" value="Ja"><label for="redogAnkHabiliteringJa" class="radio-label">Ja</label>
											<input type="radio" id="redogAnkHabiliteringNej" name="redogAnkHabilitering" value="Nej"><label for="redogAnkHabiliteringNej" class="radio-label">Nej</label>
											<input type="radio" id="redogAnkHabiliteringEjAktuellt" name="redogAnkHabilitering" value="Ej aktuellt"><label for="redogAnkHabiliteringEjAktuellt" class="radio-label">Ej aktuellt</label>
										</div>
										<input type="text" id="redogAnkHabiliteringKommentar" name="redogAnkHabiliteringKommentar" placeholder="Kommentar...">
									</div>
									<div class="input-group">
										<label>Har du ansökt om hemtjänst?</label>
										<div>
											<input type="radio" id="redogAnkHemtjanstJa" name="redogAnkHemtjanst" value="Ja"><label for="redogAnkHemtjanstJa" class="radio-label">Ja</label>
											<input type="radio" id="redogAnkHemtjanstNej" name="redogAnkHemtjanst" value="Nej"><label for="redogAnkHemtjanstNej" class="radio-label">Nej</label>
											<input type="radio" id="redogAnkHemtjanstEjAktuellt" name="redogAnkHemtjanst" value="Ej aktuellt"><label for="redogAnkHemtjanstEjAktuellt" class="radio-label">Ej aktuellt</label>
										</div>
										<input type="text" id="redogAnkHemtjanstKommentar" name="redogAnkHemtjanstKommentar" placeholder="Kommentar...">
									</div>
									<div class="input-group">
										<label>Omfattas din huvudman av LSS?</label>
										<div>
											<input type="radio" id="redogOmfLSSJa" name="redogOmfLSS" value="Ja"><label for="redogOmfLSSJa" class="radio-label">Ja</label>
											<input type="radio" id="redogOmfLSSNej" name="redogOmfLSS" value="Nej"><label for="redogOmfLSSNej" class="radio-label">Nej</label>
											<input type="radio" id="redogOmfLSSEjAktuellt" name="redogOmfLSS" value="Ej aktuellt"><label for="redogOmfLSSEjAktuellt" class="radio-label">Ej aktuellt</label>
										</div>
										<input type="text" id="redogOmfLSSKommentar" name="redogOmfLSSKommentar" placeholder="Kommentar...">
									</div>
									<div class="input-group">
										<label>Har huvudmannen personlig assistans?</label>
										<div>
											<input type="radio" id="redogPersAssistansJa" name="redogPersAssistans" value="Ja"><label for="redogPersAssistansJa" class="radio-label">Ja</label>
											<input type="radio" id="redogPersAssistansNej" name="redogPersAssistans" value="Nej"><label for="redogPersAssistansNej" class="radio-label">Nej</label>
											<input type="radio" id="redogPersAssistansEjAktuellt" name="redogPersAssistans" value="Ej aktuellt"><label for="redogPersAssistansEjAktuellt" class="radio-label">Ej aktuellt</label>
										</div>
										<input type="text" id="redogPersAssistansKommentar" name="redogPersAssistansKommentar" placeholder="Kommentar...">
									</div>
									<div class="input-group">
										<label>Har huvudmannen kontaktperson?</label>
										<div>
											<input type="radio" id="redogKontaktpersonJa" name="redogKontaktperson" value="Ja"><label for="redogKontaktpersonJa" class="radio-label">Ja</label>
											<input type="radio" id="redogKontaktpersonNej" name="redogKontaktperson" value="Nej"><label for="redogKontaktpersonNej" class="radio-label">Nej</label>
											<input type="radio" id="redogKontaktpersonEjAktuellt" name="redogKontaktperson" value="Ej aktuellt"><label for="redogKontaktpersonEjAktuellt" class="radio-label">Ej aktuellt</label>
										</div>
										<input type="text" id="redogKontaktpersonKommentar" name="redogKontaktpersonKommentar" placeholder="Kommentar...">
									</div>
									<div class="input-group">
										<label>Har din huvudman hemförsäkring?</label>
										<div>
											<input type="radio" id="redogHemforsakringJa" name="redogHemforsakring" value="Ja"><label for="redogHemforsakringJa" class="radio-label">Ja</label>
											<input type="radio" id="redogHemforsakringNej" name="redogHemforsakring" value="Nej"><label for="redogHemforsakringNej" class="radio-label">Nej</label>
											<input type="radio" id="redogHemforsakringEjAktuellt" name="redogHemforsakring" value="Ej aktuellt"><label for="redogHemforsakringEjAktuellt" class="radio-label">Ej aktuellt</label>
										</div>
										<input type="text" id="redogHemforsakringKommentar" name="redogHemforsakringKommentar" placeholder="Kommentar...">
									</div>
									<div class="input-group">
										<label>Har du avvecklat huvudmannens bostad (hyresrätt)?</label>
										<div>
											<input type="radio" id="redogAvvecklatBostadJa" name="redogAvvecklatBostad" value="Ja"><label for="redogAvvecklatBostadJa" class="radio-label">Ja</label>
											<input type="radio" id="redogAvvecklatBostadNej" name="redogAvvecklatBostad" value="Nej"><label for="redogAvvecklatBostadNej" class="radio-label">Nej</label>
											<input type="radio" id="redogAvvecklatBostadEjAktuellt" name="redogAvvecklatBostad" value="Ej aktuellt"><label for="redogAvvecklatBostadEjAktuellt" class="radio-label">Ej aktuellt</label>
										</div>
										<input type="text" id="redogAvvecklatBostadKommentar" name="redogAvvecklatBostadKommentar" placeholder="Kommentar...">
									</div>
									<div class="input-group">
										<label>Har din huvudman kostnader för omsorg, tex äldreboende?</label>
										<div>
											<input type="radio" id="redogKostnadOmsorgJa" name="redogKostnadOmsorg" value="Ja"><label for="redogKostnadOmsorgJa" class="radio-label">Ja</label>
											<input type="radio" id="redogKostnadOmsorgNej" name="redogKostnadOmsorg" value="Nej"><label for="redogKostnadOmsorgNej" class="radio-label">Nej</label>
											<input type="radio" id="redogKostnadOmsorgEjAktuellt" name="redogKostnadOmsorg" value="Ej aktuellt"><label for="redogKostnadOmsorgEjAktuellt" class="radio-label">Ej aktuellt</label>
										</div>
										<input type="text" id="redogKostnadOmsorgKommentar" name="redogKostnadOmsorgKommentar" placeholder="Kommentar...">
									</div>
									<div class="input-group">
										<label>Om ja (kostnad omsorg), har du tänkt på att ta hänsyn till förbehållsbeloppet?</label>
										<div>
											<input type="radio" id="redogForbehallBeloppJa" name="redogForbehallBelopp" value="Ja"><label for="redogForbehallBeloppJa" class="radio-label">Ja</label>
											<input type="radio" id="redogForbehallBeloppNej" name="redogForbehallBelopp" value="Nej"><label for="redogForbehallBeloppNej" class="radio-label">Nej</label>
											<input type="radio" id="redogForbehallBeloppEjAktuellt" name="redogForbehallBelopp" value="Ej aktuellt"><label for="redogForbehallBeloppEjAktuellt" class="radio-label">Ej aktuellt</label>
										</div>
										<input type="text" id="redogForbehallBeloppKommentar" name="redogForbehallBeloppKommentar" placeholder="Kommentar...">
									</div>
									<div class="input-group">
										<label>Har du tecknat hyresavtal?</label>
										<div>
											<input type="radio" id="redogTecknatHyresavtalJa" name="redogTecknatHyresavtal" value="Ja"><label for="redogTecknatHyresavtalJa" class="radio-label">Ja</label>
											<input type="radio" id="redogTecknatHyresavtalNej" name="redogTecknatHyresavtal" value="Nej"><label for="redogTecknatHyresavtalNej" class="radio-label">Nej</label>
											<input type="radio" id="redogTecknatHyresavtalEjAktuellt" name="redogTecknatHyresavtal" value="Ej aktuellt"><label for="redogTecknatHyresavtalEjAktuellt" class="radio-label">Ej aktuellt</label>
										</div>
										<input type="text" id="redogTecknatHyresavtalKommentar" name="redogTecknatHyresavtalKommentar" placeholder="Kommentar...">
									</div>
									<div class="input-group">
										<label>Har du ansökt om nytt boende?</label>
										<div>
											<input type="radio" id="redogAnsoktNyttBoendeJa" name="redogAnsoktNyttBoende" value="Ja"><label for="redogAnsoktNyttBoendeJa" class="radio-label">Ja</label>
											<input type="radio" id="redogAnsoktNyttBoendeNej" name="redogAnsoktNyttBoende" value="Nej"><label for="redogAnsoktNyttBoendeNej" class="radio-label">Nej</label>
											<input type="radio" id="redogAnsoktNyttBoendeEjAktuellt" name="redogAnsoktNyttBoende" value="Ej aktuellt"><label for="redogAnsoktNyttBoendeEjAktuellt" class="radio-label">Ej aktuellt</label>
										</div>
										<input type="text" id="redogAnsoktNyttBoendeKommentar" name="redogAnsoktNyttBoendeKommentar" placeholder="Kommentar...">
									</div>
									<div class="input-group">
										<label for="redogEkonomiOvrigtSoktFondmedel_Text">Övrigt: Sökt fondmedel (kommentar)</label>
										<input type="text" id="redogEkonomiOvrigtSoktFondmedel_Text" name="redogEkonomiOvrigtSoktFondmedel_Text" placeholder="Kommentar...">
									</div>
								</div>
							</div>
							<hr>

							<div class="collapsible-section" id="redog-section-kontakter">
								<h3 class="collapsible-header">5. Kontakter och tidsinsats <span class="toggler">▼</span></h3>
								<div class="collapsible-content">
									<div class="input-group">
										<label>Antal besök hos huvudmannen:</label>
										<div>
											<input type="radio" id="redogAntalBesokTyp1" name="redogAntalBesokTyp" value="1 gång/ vecka"><label for="redogAntalBesokTyp1" class="radio-label">1 gång/ vecka</label>
											<input type="radio" id="redogAntalBesokTyp2" name="redogAntalBesokTyp" value="1 - 2 gånger/månad"><label for="redogAntalBesokTyp2" class="radio-label">1 - 2 gånger/månad</label>
										</div>
									</div>
									<div class="input-group">
										<label>Vistelse med huvudmannen utanför hemmet/boendet:</label>
										<div>
											<input type="radio" id="redogVistelseUtanforHemmetNej" name="redogVistelseUtanforHemmet" value="Nej"><label for="redogVistelseUtanforHemmetNej" class="radio-label">Nej</label>
											<input type="radio" id="redogVistelseUtanforHemmetJa" name="redogVistelseUtanforHemmet" value="Ja"><label for="redogVistelseUtanforHemmetJa" class="radio-label">Ja, exempelvis</label>
										</div>
										<input type="text" id="redogVistelseUtanforHemmetDetaljer" name="redogVistelseUtanforHemmetDetaljer" placeholder="Specificera...">
									</div>
									<div class="input-group">
										<label for="redogAntalTelefonsamtal">Antal telefonsamtal med huvudmannen:</label>
										<input type="text" id="redogAntalTelefonsamtal" name="redogAntalTelefonsamtal">
									</div>
									<div class="input-group">
										<label for="redogAntalKontakterAnhoriga">Antal kontakter med anhöriga eller vårdinstitutionen om huvudmannen:</label>
										<input type="text" id="redogAntalKontakterAnhoriga" name="redogAntalKontakterAnhoriga">
									</div>
									<div class="input-group">
										<label for="redogOvrigaInsatserText">Övriga insatser, exempelvis besök hos läkare/tandläkare, insats i huvudmannens bostad etc.:</label>
										<textarea id="redogOvrigaInsatserText" name="redogOvrigaInsatserText" rows="4"></textarea>
									</div>
								</div>
							</div>
							<hr>

							<div class="collapsible-section" id="redog-section-forvaltaegendom">
								<h3 class="collapsible-header">6. Uppdraget att Förvalta egendom <span class="toggler">▼</span></h3>
								<div class="collapsible-content">
									<h4>1. Hur har de löpande betalningarna skett?</h4>
									<div class="input-group">
										<input type="checkbox" id="redogBetalningInternetbank" name="redogBetalningInternetbank" style="width:auto; margin-right: 5px;"><label for="redogBetalningInternetbank" class="inline-label">Internetbank</label>
									</div>
									<div class="input-group">
										<input type="checkbox" id="redogBetalningAutogiro" name="redogBetalningAutogiro" style="width:auto; margin-right: 5px;"><label for="redogBetalningAutogiro" class="inline-label">Autogiro</label>
									</div>
									<h4>2. Hur har huvudmannen fått kontanter / egna medel?</h4>
									<div class="input-group">
										<input type="checkbox" id="redogKontooverforingHm" name="redogKontooverforingHm" style="width:auto; margin-right: 5px;"><label for="redogKontooverforingHm" class="inline-label">Kontoöverföring till huvudmannen</label>
									</div>
									<div class="input-group">
										<input type="checkbox" id="redogKontanterHmKvitto" name="redogKontanterHmKvitto" style="width:auto; margin-right: 5px;"><label for="redogKontanterHmKvitto" class="inline-label">Kontanter till huvudmannen mot kvittens</label>
									</div>
									<div class="input-group">
										<input type="checkbox" id="redogKontooverforingBoende" name="redogKontooverforingBoende" style="width:auto; margin-right: 5px;"><label for="redogKontooverforingBoende" class="inline-label">Kontoöverföring boende/hemtjänsttill</label>
									</div>
									<div class="input-group">
										<input type="checkbox" id="redogKontanterBoendeKvitto" name="redogKontanterBoendeKvitto" style="width:auto; margin-right: 5px;"><label for="redogKontanterBoendeKvitto" class="inline-label">Kontanter till boende/hemtjänst mot kvittens</label>
									</div>

									<h4>Förvaltningsinsatser under perioden/året</h4>
									<div class="input-group">
										<label>Har du sålt/köpt fastighet/bostadsrätt?</label>
										<div>
											<input type="radio" id="redogForvaltningSaltKoptFastighetJa" name="redogForvaltningSaltKoptFastighet" value="Ja"><label for="redogForvaltningSaltKoptFastighetJa" class="radio-label">Ja</label>
											<input type="radio" id="redogForvaltningSaltKoptFastighetNej" name="redogForvaltningSaltKoptFastighet" value="Nej"><label for="redogForvaltningSaltKoptFastighetNej" class="radio-label">Nej</label>
										</div>
										<input type="text" id="redogForvaltningSaltKoptFastighetKommentar" name="redogForvaltningSaltKoptFastighetKommentar" placeholder="Kommentar...">
									</div>
									<div class="input-group">
										<label>Har du hyrt/hyrt ut fastighet/bostadsrätt?</label>
										<div>
											<input type="radio" id="redogForvaltningHyrtUtFastighetJa" name="redogForvaltningHyrtUtFastighet" value="Ja"><label for="redogForvaltningHyrtUtFastighetJa" class="radio-label">Ja</label>
											<input type="radio" id="redogForvaltningHyrtUtFastighetNej" name="redogForvaltningHyrtUtFastighet" value="Nej"><label for="redogForvaltningHyrtUtFastighetNej" class="radio-label">Nej</label>
										</div>
										<input type="text" id="redogForvaltningHyrtUtFastighetKommentar" name="redogForvaltningHyrtUtFastighetKommentar" placeholder="Kommentar...">
									</div>
									<div class="input-group">
										<label>Har du sålt/köpt aktier?</label>
										<div>
											<input type="radio" id="redogForvaltningSaltKoptAktierJa" name="redogForvaltningSaltKoptAktier" value="Ja"><label for="redogForvaltningSaltKoptAktierJa" class="radio-label">Ja</label>
											<input type="radio" id="redogForvaltningSaltKoptAktierNej" name="redogForvaltningSaltKoptAktier" value="Nej"><label for="redogForvaltningSaltKoptAktierNej" class="radio-label">Nej</label>
										</div>
										<input type="text" id="redogForvaltningSaltKoptAktierKommentar" name="redogForvaltningSaltKoptAktierKommentar" placeholder="Kommentar...">
									</div>
									<div class="input-group">
										<label>Har annan värdespappersförvaltning förekommit?</label>
										<div>
											<input type="radio" id="redogForvaltningAnnanVardepapperJa" name="redogForvaltningAnnanVardepapper" value="Ja"><label for="redogForvaltningAnnanVardepapperJa" class="radio-label">Ja</label>
											<input type="radio" id="redogForvaltningAnnanVardepapperNej" name="redogForvaltningAnnanVardepapper" value="Nej"><label for="redogForvaltningAnnanVardepapperNej" class="radio-label">Nej</label>
										</div>
										<input type="text" id="redogForvaltningAnnanVardepapperKommentar" name="redogForvaltningAnnanVardepapperKommentar" placeholder="Kommentar...">
									</div>
									<div class="input-group">
										<label>Har du sökt skuldsanering?</label>
										<div>
											<input type="radio" id="redogForvaltningSoktSkuldsaneringJa" name="redogForvaltningSoktSkuldsanering" value="Ja"><label for="redogForvaltningSoktSkuldsaneringJa" class="radio-label">Ja</label>
											<input type="radio" id="redogForvaltningSoktSkuldsaneringNej" name="redogForvaltningSoktSkuldsanering" value="Nej"><label for="redogForvaltningSoktSkuldsaneringNej" class="radio-label">Nej</label>
										</div>
										<input type="text" id="redogForvaltningSoktSkuldsaneringKommentar" name="redogForvaltningSoktSkuldsaneringKommentar" placeholder="Kommentar...">
									</div>
									<div class="input-group">
										<label for="redogForvaltningOvrigt2">Övrigt:</label>
										<input type="text" id="redogForvaltningOvrigt2" name="redogForvaltningOvrigt2" placeholder="Kommentar...">
									</div>
								</div>
							</div>
							<hr>

							<div class="collapsible-section" id="redog-section-arvode">
								<h3 class="collapsible-header">7. Arvode <span class="toggler">▼</span></h3>
								<div class="collapsible-content">
									<p><strong>Önskar arvode för:</strong></p>
									<div class="input-group">
										<input type="checkbox" id="redogArvodeBevakaRatt" name="redogArvodeBevakaRatt" style="width:auto; margin-right: 5px;"><label for="redogArvodeBevakaRatt" class="inline-label">Bevaka rätt</label>
									</div>
									<div class="input-group">
										<input type="checkbox" id="redogArvodeForvaltaEgendom" name="redogArvodeForvaltaEgendom" style="width:auto; margin-right: 5px;"><label for="redogArvodeForvaltaEgendom" class="inline-label">Förvalta egendom</label>
									</div>
									<div class="input-group">
										<input type="checkbox" id="redogArvodeSorjaForPerson" name="redogArvodeSorjaForPerson" style="width:auto; margin-right: 5px;"><label for="redogArvodeSorjaForPerson" class="inline-label">Sörja för person</label>
									</div>
									<hr>
									<div class="input-group">
										<label>Arbetsinsatsen med att vara god man åt huvudmannen har varit:</label>
										<div>
											<input type="radio" id="redogArbetsinsatsLiten" name="redogArbetsinsats" value="Liten"><label for="redogArbetsinsatsLiten" class="radio-label">Liten</label>
											<input type="radio" id="redogArbetsinsatsNormal" name="redogArbetsinsats" value="Normal"><label for="redogArbetsinsatsNormal" class="radio-label">Normal</label>
											<input type="radio" id="redogArbetsinsatsStor" name="redogArbetsinsats" value="Stor"><label for="redogArbetsinsatsStor" class="radio-label">Stor</label>
										</div>
									</div>
									<div class="input-group">
										<label>Önskar kostnadsersättning:</label>
										<div>
											<input type="radio" id="redogOnskarKostnadsersattningSchablon" name="redogOnskarKostnadsersattning" value="schablon"><label for="redogOnskarKostnadsersattningSchablon" class="radio-label">enl schablon dvs 2 % av prisbasbelopp</label>
										</div>
										<div>
											<input type="radio" id="redogOnskarKostnadsersattningSpecifikation" name="redogOnskarKostnadsersattning" value="specifikation"><label for="redogOnskarKostnadsersattningSpecifikation" class="radio-label">enl specifikation (alla kostnader ska verifieras)</label>
										</div>
									</div>
									<div class="input-group">
										<label for="redogReseersattningKm">Reseersättning antal km:</label>
										<input type="text" id="redogReseersattningKm" name="redogReseersattningKm">
									</div>
									<div class="input-group">
										<label>Körjournal bifogas:</label>
										<div>
											<input type="radio" id="redogKorjournalBifogasJa" name="redogKorjournalBifogas" value="Ja"><label for="redogKorjournalBifogasJa" class="radio-label">Ja</label>
											<input type="radio" id="redogKorjournalBifogasNej" name="redogKorjournalBifogas" value="Nej"><label for="redogKorjournalBifogasNej" class="radio-label">Nej</label>
										</div>
									</div>
									<div class="input-group">
										<label for="redogArvodeOvrigt">Övrigt (ang. arvode):</label>
										<textarea id="redogArvodeOvrigt" name="redogArvodeOvrigt" rows="3"></textarea>
									</div>
								</div>
							</div>
							<hr>
							<div class="collapsible-section" id="redog-section-underskrift">
								<h3 class="collapsible-header">8. Underskrift <span class="toggler">▼</span></h3>
								<div class="collapsible-content">
									<p><em>Denna sektion fylls normalt i på den utskrivna PDF:en. Datum och ort kan förifyllas här om så önskas.</em></p>
									<div class="form-grid">
										<div class="form-column">
											<div class="input-group">
												<label for="redogUnderskriftDatum">Datum för underskrift:</label>
												<input type="date" id="redogUnderskriftDatum" name="redogUnderskriftDatum">
											</div>
										</div>
										<div class="form-column">
											<div class="input-group">
												<label for="redogUnderskriftOrt">Ort för underskrift:</label>
												<input type="text" id="redogUnderskriftOrt" name="redogUnderskriftOrt">
											</div>
										</div>
									</div>
								</div>
							</div>

						</div>
					</div>
				</div>
				<div class="tab-content" id="tab-forsorjningsstod">
					<div class="box">
						<h2>Ansökan Försörjningsstöd</h2>
						<p>Välj huvudman på "Huvudman"-fliken. Huvudmannens generella uppgifter används. Välj sedan kommun och generera PDF.</p>
						<div class="input-group">
							<label>Välj kommun för ansökan:</label>
							<button onclick="openForsorjningsstodModal('Stockholm Stad', 'Ansokan_Stockholm.pdf')">Stockholm Stad</button>
							<button onclick="openForsorjningsstodModal('Järfälla Kommun', 'Ansokan_Jarfalla.pdf')">Järfälla Kommun</button>
							<button onclick="openForsorjningsstodModal('Upplands Väsby', 'Ansokan_Upplands_Vasby.pdf')">Upplands Väsby</button>
						</div>
					</div>
				</div>
				<div class="tab-content" id="tab-arvode">
					<div class="box">
						<h2>Arvodesberäkning</h2>
						<p>Välj huvudman på "Huvudman"-fliken. Klicka sedan här för att göra en arvodesberäkning och generera underlag.</p>
						<button onclick="openArvodesModal()">Öppna Arvodesberäkning</button>
					</div>
				</div>
				<div class="tab-content" id="tab-brev">
					<div class="box">
						<h2>Skapa Brev</h2>
						<p>Välj huvudman på "Huvudman"-fliken. Skriv din brevmall nedan och använd platshållare för att infoga data.</p>
						<div class="input-group">
							<label for="letterTemplate">Brevmall:</label>
							<textarea id="letterTemplate" placeholder="Skriv ditt brev här... Använd platshållare som {{HUVUDMAN_FORNAMN}} etc."></textarea>
						</div>
						<div id="letterPlaceholders">
							<strong>Tillgängliga platshållare:</strong>
							<ul>
								<li>{{HUVUDMAN_FORNAMN}}</li>
								<li>{{HUVUDMAN_EFTERNAMN}}</li>
								<li>{{HUVUDMAN_HELTNAMN}}</li>
								<li>{{HUVUDMAN_PNR}}</li>
								<li>{{HUVUDMAN_ADRESS}}</li>
								<li>{{HUVUDMAN_POSTNR}}</li>
								<li>{{HUVUDMAN_POSTORT}}</li>
								<li>{{HUVUDMAN_VISTELSEADRESS}}</li>
								<li>{{HUVUDMAN_VISTELSEPOSTNR}}</li>
								<li>{{HUVUDMAN_VISTELSEORT}}</li>
								<li>{{GODMAN_FORNAMN}}</li>
								<li>{{GODMAN_EFTERNAMN}}</li>
								<li>{{GODMAN_HELTNAMN}}</li>
								<li>{{GODMAN_ADRESS}}</li>
								<li>{{GODMAN_POSTNR}}</li>
								<li>{{GODMAN_POSTORT}}</li>
								<li>{{GODMAN_TELEFON}}</li>
								<li>{{GODMAN_MOBIL}}</li>
								<li>{{GODMAN_EPOST}}</li>
								<li>{{DAGENS_DATUM}} (YYYY-MM-DD)</li>
								<li>{{FORORDNANDE_DATUM}}</li>
							</ul>
						</div>
						<button onclick="generateLetterPdf()">Generera Brev (PDF)</button>
					</div>
				</div>
				<div class="tab-content" id="tab-godman-profiler">
					<div class="box">
						<h2>Hantera God Man Profiler</h2>
						<p>Välj en profil att redigera, eller skapa en ny. En profil måste vara markerad som "Nuvarande användare" för att automatiskt användas i PDF-utskrifter.</p>
						<div class="input-group">
							<label for="godmanProfileSelect">Välj profil:</label>
							<select id="godmanProfileSelect">
								<option value="">-- Välj profil --</option>
							</select>
							<button onclick="createNewGodManProfile()">Skapa Ny Profil</button>
						</div>
						<hr>
						<div id="godmanProfileEditForm" style="display:none;">
							<input type="hidden" id="godmanEditProfilId" />
							<div class="input-group"><label for="godmanEditProfilFornamn">Förnamn:</label><input type="text" id="godmanEditProfilFornamn" /></div>
							<div class="input-group"><label for="godmanEditProfilEfternamn">Efternamn:</label><input type="text" id="godmanEditProfilEfternamn" /></div>
							<div class="input-group"><label for="godmanEditProfilPersonnummer">Personnummer:</label><input type="text" id="godmanEditProfilPersonnummer" placeholder="ÅÅÅÅMMDD-XXXX" /></div>
							<div class="input-group"><label for="godmanEditProfilAdress">Adress:</label><input type="text" id="godmanEditProfilAdress" /></div>
							<div class="input-group"><label for="godmanEditProfilPostnummer">Postnummer:</label><input type="text" id="godmanEditProfilPostnummer" /></div>
							<div class="input-group"><label for="godmanEditProfilPostort">Postort:</label><input type="text" id="godmanEditProfilPostort" /></div>
							<div class="input-group"><label for="godmanEditProfilTelefon">Telefon dagtid:</label><input type="text" id="godmanEditProfilTelefon" /></div>
							<div class="input-group"><label for="godmanEditProfilMobil">Mobilnummer:</label><input type="text" id="godmanEditProfilMobil" /></div>
							<div class="input-group"><label for="godmanEditProfilEpost">E-postadress:</label><input type="email" id="godmanEditProfilEpost" /></div>
							<div class="input-group"><label for="godmanEditProfilClearingnummer">Clearingnummer:</label><input type="text" id="godmanEditProfilClearingnummer" /></div>
							<div class="input-group"><label for="godmanEditProfilKontonummer">Kontonummer:</label><input type="text" id="godmanEditProfilKontonummer" /></div>
							<div class="input-group">
								<input type="checkbox" id="godmanEditIsCurrentUser" style="width: auto; margin-right: 5px;">
								<label for="godmanEditIsCurrentUser" class="inline-label">Är nuvarande användare (för PDF-standard)</label>
							</div>
							<button onclick="saveGodManProfileChanges()">Spara Ändringar i Profil</button>
							<button class="secondary" onclick="clearGodManEditForm()">Rensa Formulär (för ny)</button>
						</div>
					</div>
				</div>
				<div class="tab-content" id="tab-nordea-auto">
					<div class="box">
						<h2>Nordea Automatisk Hämtning</h2>
						<p>Detta verktyg hjälper dig att automatiskt hämta kontoutdrag från Nordea Netbank. Följ stegen nedan.</p>
					</div>

					<div class="box">
						<h3>Steg 1: Förberedelser</h3>
						<p>Klicka på knappen nedan för att öppna Microsoft Edge i ett speciellt felsökningsläge (CDP) och navigera till Nordeas inloggningssida. <strong>Logga in manuellt med BankID och acceptera eventuella cookies.</strong> Kom sedan tillbaka hit för nästa steg.</p>
						<button onclick="startNordeaEdge()" class="primary-action"><i class="fab fa-edge"></i> Öppna Edge & Logga in manuellt</button>
						<div id="nordeaEdgeStatus" style="margin-top: 10px; font-style: italic;"></div>
					</div>

					<div class="box">
						<h3>Steg 2: Ange Uppgifter & Kör Automatisering</h3>
						<p>När du är inloggad i Nordea (och står på "Översikt"-sidan), fyll i uppgifterna nedan och starta automatiseringen.</p>
						<div class="form-grid">
							<div class="form-column">
								<div class="input-group">
									<label for="nordeaUserToSwitch">Huvudman att byta till i Nordea:</label>
									<input type="text" id="nordeaUserToSwitch" placeholder="T.ex. JOHANSSON ULLA">
								</div>
								<div class="input-group">
									<label for="nordeaAccountName">Kontonamn att välja:</label>
									<input type="text" id="nordeaAccountName" placeholder="T.ex. Räkningskonto eller Sparkonto">
								</div>
							</div>
							<div class="form-column">
								<div class="input-group">
									<label for="nordeaDateFrom">Från datum:</label>
									<input type="date" id="nordeaDateFrom">
								</div>
								<div class="input-group">
									<label for="nordeaDateTo">Till datum:</label>
									<input type="date" id="nordeaDateTo">
								</div>
							</div>
						</div>
						<div class="input-group" style="margin-top: 15px;">
							<label style="margin-bottom: 5px;">Välj format för nedladdning:</label>
							<div>
								<input type="radio" id="nordeaFormatPdf" name="nordeaOutputFormat" value="PDF" checked style="width:auto; margin-right:5px;">
								<label for="nordeaFormatPdf" class="radio-label">PDF</label>
								<input type="radio" id="nordeaFormatCsv" name="nordeaOutputFormat" value="CSV" style="width:auto; margin-left:15px; margin-right:5px;">
								<label for="nordeaFormatCsv" class="radio-label">CSV</label>
							</div>
						</div>
						<button onclick="runNordeaAutomation()" class="primary-action" style="margin-top: 20px;"><i class="fas fa-cogs"></i> Kör Automatiseringen</button>
						<div id="nordeaAutomationStatus" style="margin-top: 10px; font-style: italic;"></div>
					</div>
				</div>

				<div class="tab-content" id="tab-fakturor">
					<div class="box">
						<h2>Betala Fakturor med RPA-assistent</h2>
						<p>Detta verktyg hjälper dig att automatisera betalning av PDF-fakturor via din internetbank med hjälp av en UiPath-robot. Processen är "assisterad", vilket innebär att du behöver godkänna inloggning och signering med BankID.</p>
					</div>

					<div class="box">
						<h3>Steg 1: Förbered Fakturor</h3>
						<p>Se till att alla PDF-fakturor du vill betala (upp till 20 st) ligger i en specifik mapp på din dator som roboten har tillgång till. Roboten kommer att gå igenom alla filer i denna mapp.</p>
						<div class="input-group">
							<label for="fakturaMappPath">Sökväg till fakturamapp:</label>
							<input type="text" id="fakturaMappPath" value="C:\Users\lars-1\OneDrive\Skrivbord\FakturaTest\Nya" disabled>
							<small><em>Denna sökväg konfigureras direkt i UiPath-roboten.</em></small>
						</div>
					</div>

					<div class="box">
						<h3>Steg 2: Starta Automatiseringen</h3>
						<p>Välj vilken bank roboten ska logga in på och klicka sedan på "Starta Betalningsrobot". Roboten kommer att starta, be dig logga in med BankID, och sedan bearbeta varje faktura.</p>
						<div class="input-group">
							<label for="bankChoice">Välj bank:</label>
							<select id="bankChoice">
								<option value="Nordea">Nordea</option>
								<option value="Swedbank">Swedbank</option>
								<option value="Handelsbanken">Handelsbanken</option>
								<option value="SEB">SEB</option>
							</select>
						</div>
						<button id="startRpaButton" class="primary-action"><i class="fas fa-robot"></i> Starta Betalningsrobot</button>
						<div id="rpaStatus" style="margin-top: 15px; font-style: italic;">
							Status: Väntar på start...
						</div>
					</div>

					<div class="box">
						<h3>Logg över Betalda Fakturor</h3>
						<p>Här visas en logg över de fakturor som roboten har bearbetat under den senaste körningen.</p>
						<table id="fakturaLogTable">
							<thead>
								<tr>
									<th>Fakturafil</th>
									<th>Mottagare</th>
									<th>Belopp</th>
									<th>Förfallodag</th>
									<th>Status</th>
								</tr>
							</thead>
							<tbody>
								<tr>
									<td colspan="5"><i>Inga fakturor har bearbetats ännu.</i></td>
								</tr>
							</tbody>
						</table>
					</div>
				</div>

				<div class="tab-content" id="tab-lankar">
					<div class="box">
						<h2>Länksamling</h2>
						<p>Här kan du spara och organisera viktiga länkar. Klicka på en kategori för att se länkarna, eller lägg till en ny länk nedan.</p>
						<div id="linkCategoriesContainer">
						</div>
					</div>

					<div class="box">
						<h3>Lägg till / Redigera Länk</h3>
						<input type="hidden" id="linkEditId">
						<div class="form-grid">
							<div class="form-column">
								<div class="input-group">
									<label for="linkName">Namn på länken:</label>
									<input type="text" id="linkName" placeholder="T.ex. Skatteverket - Huvudblankett">
								</div>
								<div class="input-group">
									<label for="linkUrl">URL (webbadress):</label>
									<input type="url" id="linkUrl" placeholder="https://www.exempel.se/blankett">
								</div>
							</div>
							<div class="form-column">
								<div class="input-group">
									<label for="linkCategory">Kategori:</label>
									<input type="text" id="linkCategory" placeholder="T.ex. Överförmyndarblanketter">
								</div>
							</div>
						</div>
						<button id="saveLinkButton" class="primary-action">Spara Länk</button>
						<button id="clearLinkFormButton" class="secondary">Rensa Formulär</button>
					</div>
				</div>

				<div class="tab-content" id="tab-pdf-templates">
					<div class="box">
						<h3>Sparade Mallar</h3>
						<p>Här är de mallar du har laddat upp. I framtiden kan du klicka här för att redigera eller använda dem.</p>
						<div id="savedTemplatesListContainer">
							<p><i>Laddar mallar...</i></p>
						</div>
					</div>
					<div class="box">
						<h2>Hantera PDF-mallar</h2>
						<p>Här kan du ladda upp nya PDF-blanketter (som redan har ifyllbara fält) och koppla deras fält till databasen. Detta gör att programmet kan fylla i dem automatiskt i framtiden.</p>
					</div>

					<div class="box">
						<h3>1. Ladda upp en ny mall</h3>
						<div class="form-grid">
							<div class="form-column">
								<div class="input-group">
									<label for="templateNameInput">Ge mallen ett namn (t.ex. "Ansökan FS Stockholm"):</label>
									<input type="text" id="templateNameInput" placeholder="Unikt namn för mallen...">
								</div>
							</div>
							<div class="form-column">
								<div class="input-group">
									<label for="templateFileInput">Välj PDF-fil att ladda upp:</label>
									<input type="file" id="templateFileInput" accept=".pdf">
								</div>
							</div>
						</div>
						<div id="pdfUploadStatus" style="margin-top: 10px; font-style: italic;"></div>
					</div>

					<div class="box" id="mappingSection">
						<h3>2. Koppla PDF-fält till Databasen</h3>
						<p>För varje fält som hittades i din PDF, välj vilken datakolumn från `huvudman`-tabellen som ska användas för att fylla i det.</p>
						<div id="mappingTableContainer" style="overflow-x: auto; margin-top: 15px;">
						</div>
						<div style="margin-top: 20px; text-align: right;">
							<button id="saveMappingButton">Spara Kopplingar</button>
						</div>
					</div>
				</div>
				<div class="tab-content" id="tab-help">
					<div class="box">
						<h2><i class="fas fa-question-circle"></i> Hjälp & Guider</h2>
						<p>Välkommen till hjälpsektionen! Här kommer du att hitta användbara resurser för att få ut det mesta av Godman App.</p>
						<div class="dashboard-widgets">
							<div class="widget">
								<h3><i class="fas fa-play-circle"></i> Introduktionsvideor (Planerat)</h3>
								<ul>
									<li>Kom igång med Godman App</li>
									<li>Så skapar du en årsräkning</li>
								</ul>
							</div>
							<div class="widget">
								<h3><i class="fas fa-book-open"></i> Skrivna Guider (Planerat)</h3>
								<ul>
									<li>Importera kontoutdrag</li>
									<li>Använd kategoriseringsregler</li>
								</ul>
							</div>
						</div>
					</div>
				</div>

				<div class="tab-content" id="tab-generator">
					<div class="box">
						<h2>Skapa Dokument från Mall</h2>
						<p>Välj en huvudman och en sparad PDF-mall. Programmet kommer att förifylla de fält du behöver för att sedan generera det färdiga dokumentet.</p>
					</div>

					<div class="box">
						<h3>1. Välj Huvudman och Mall</h3>
						<div class="form-grid">
							<div class="form-column">
								<div class="input-group">
									<label for="generatorHuvudmanSelect">Välj Huvudman:</label>
									<select id="generatorHuvudmanSelect">
										<option value="">-- Välj först --</option>
									</select>
								</div>
							</div>
							<div class="form-column">
								<div class="input-group">
									<label for="generatorTemplateSelect">Välj Mall:</label>
									<select id="generatorTemplateSelect">
										<option value="">-- Välj huvudman först --</option>
									</select>
								</div>
							</div>
						</div>
						<button id="loadDataForPdfButton" disabled>Hämta data & Förbered</button>
					</div>

					<div class="box" id="ocrHelperSection">
						<h3>Hjälp med ifyllnad från Faktura</h3>
						<p>Ladda upp en skannad faktura (PDF) för att försöka hitta och fylla i manuella fält automatiskt.</p>
						<div class="input-group">
							<label for="ocrFakturaInput">Välj faktura-PDF:</label>
							<input type="file" id="ocrFakturaInput" accept=".pdf">
							<div id="ocrStatus" style="font-style: italic; margin-top: 5px;"></div>
						</div>
					</div>
					<div class="box" id="pdfPreviewSection">
						<h3>2. Granska & Fyll i Manuella Fält</h3>
						<p>Här är datan som kommer att fyllas i PDF:en. Du kan redigera värdena direkt. Fyll i eventuella manuella fält som krävs för denna mall.</p>

						<div id="pdfPreviewFormContainer">
						</div>
						<div style="margin-top: 20px; text-align: right;">
							<button id="generateFinalPdfButton">Skapa Färdig PDF</button>
						</div>
					</div>
				</div>
				<div class="tab-content" id="tab-arkiv">
					<div class="box">
						<h2>Dokumentarkiv</h2>
						<p>Här kan du ladda upp och hantera sparade dokument för en specifik huvudman, till exempel registerutdrag, fullmakter eller beslut.</p>
						<div class="input-group">
							<label for="arkivHuvudmanSelect">Välj Huvudman för att se eller ladda upp dokument:</label>
							<select id="arkivHuvudmanSelect">
								<option value="">-- Välj först --</option>
							</select>
						</div>
					</div>

					<div class="box" id="arkivContentSection">
						<h3>Dokument för <span id="arkivHuvudmanNamn"></span></h3>
						<div id="arkivTableContainer">
						</div>
						<hr style="margin: 25px 0;">
						<h4>Ladda upp nytt dokument</h4>
						<div class="form-grid">
							<div class="form-column">
								<div class="input-group">
									<label for="arkivDokumentTyp">Beskrivning / Dokumenttyp:</label>
									<input type="text" id="arkivDokumentTyp" placeholder="T.ex. Registerutdrag 2024-06-11">
								</div>
							</div>
							<div class="form-column">
								<div class="input-group">
									<label for="arkivFilInput">Välj fil (PDF):</label>
									<input type="file" id="arkivFilInput" accept=".pdf">
								</div>
							</div>
						</div>
						<button id="uploadArkivButton" disabled>Ladda Upp Dokument</button>
						<div id="arkivUploadStatus" style="margin-top: 10px; font-style: italic;"></div>
					</div>
				</div>
				<div id="ruleModal" class="modal">
					<div class="modal-content"> <span class="close-button" onclick="closeRuleModal()">×</span>
						<h3 id="modalTitle">Lägg till/Redigera Regel</h3> <input id="ruleId" type="hidden" />
						<div><label for="matchType">Matchningstyp:</label><select id="matchType">
								<option value="Innehåller">Innehåller</option>
								<option value="Exakt">Exakt</option>
								<option value="BörjarMed">Börjar med</option>
								<option value="SlutarMed">Slutar med</option>
							</select></div>
						<div><label for="matchText">Matchningstext (skiftlägesokänslig):</label><input id="matchText" type="text" placeholder="Text som ska matchas..." /></div>
						<div><label for="ruleCategory">Kategori:</label><select id="ruleCategory">
								<option value="">-- Välj Kategori --</option>
							</select></div>
						<div><label for="rulePriority">Prioritet (0=normal, högre=viktigare):</label><input id="rulePriority" type="number" step="1" value="0" title="Högre siffra = högre prioritet (testas först)" /></div>
						<div class="modal-buttons"><button class="secondary" onclick="closeRuleModal()">Avbryt</button><button onclick="saveRule()">Spara Regel</button></div>
					</div>
				</div>
				<div id="adjustmentModal" class="modal">
					<div class="modal-content"> <span class="close-button" onclick="closeAdjustmentModal()">×</span>
						<h3>Justera Bruttoinkomst</h3>
						<p>För transaktion: <strong id="adjustmentModalDate"></strong> - <span id="adjustmentModalText"></span></p> <input id="adjustmentTransactionId" type="hidden" />
						<div class="input-group"> <label>Belopp enligt kontoutdrag:</label> <input id="adjustmentOriginalAmountDisplay" type="text" disabled="" style="font-weight:bold; background-color: #f0f0f0;" /> <input id="adjustmentOriginalAmountValue" type="hidden" /> </div>
						<div class="input-group"> <label for="adjustmentTax">Lägg till Skatt (+):</label> <input id="adjustmentTax" type="number" step="0.01" placeholder="0.00" value="0" /> </div>
						<div class="input-group"> <label for="adjustmentGarnishment">Lägg till Utmätning (+):</label> <input id="adjustmentGarnishment" type="number" step="0.01" placeholder="0.00" value="0" /> </div>
						<div class="input-group"> <label for="adjustmentHousing">Dra av Bostadstillägg/Bostadsbidrag (-):</label> <input id="adjustmentHousing" type="number" step="0.01" placeholder="0.00" value="0" /> </div>
						<div class="input-group"> <label for="adjustmentAddCost">Dra av Merkostnadsersättning (-):</label> <input id="adjustmentAddCost" type="number" step="0.01" placeholder="0.00" value="0" /> </div>
						<hr />
						<div class="input-group"> <label>Beräknad Bruttoinkomst:</label> <span id="adjustmentCalculatedGross" style="font-weight:bold; background-color: #e9ffe9; padding: 10px; border: 1px solid #ccc; border-radius: 4px; display: inline-block; min-width:100px; text-align:right;">0,00</span> </div>
						<div class="input-group"> <label>Belopp till Bostadsbidrag:</label> <span id="adjustmentCalculatedHousing" style="font-weight:bold; background-color: #e9f5ff; padding: 10px; border: 1px solid #ccc; border-radius: 4px; display: inline-block; min-width:100px; text-align:right;">0,00</span> </div>
						<div class="input-group"> <label>Belopp till Merkost.ers:</label> <span id="adjustmentCalculatedAddCost" style="font-weight:bold; background-color: #e9f5ff; padding: 10px; border: 1px solid #ccc; border-radius: 4px; display: inline-block; min-width:100px; text-align:right;">0,00</span> </div>
						<div class="modal-buttons"> <button class="secondary" onclick="closeAdjustmentModal()">Avbryt</button> <button onclick="saveTransactionAdjustments()">Spara Justeringar</button> </div>
					</div>
				</div>
				<div id="overformyndareModal" class="modal">
					<div class="modal-content">
						<span class="close-button" onclick="closeOverformyndareModal()">×</span>

						<h3 id="ofnModalTitle">Lägg till Ny Överförmyndare</h3>

						<input type="hidden" id="editOfnId">

						<div class="input-group"><label for="newOfnNamn">Namn på enhet:</label><input type="text" id="newOfnNamn" /></div>
						<div class="input-group"><label for="newOfnAdress">Adress:</label><input type="text" id="newOfnAdress" /></div>
						<div class="input-group"><label for="newOfnPostnummer">Postnummer:</label><input type="text" id="newOfnPostnummer" /></div>
						<div class="input-group"><label for="newOfnPostort">Postort:</label><input type="text" id="newOfnPostort" /></div>
						<div class="input-group"><label for="newOfnTelefon">Telefon (valfritt):</label><input type="text" id="newOfnTelefon" /></div>
						<div class="input-group"><label for="newOfnEpost">E-post (valfritt):</label><input type="email" id="newOfnEpost" /></div>

						<div class="modal-buttons">
							<button class="secondary" onclick="closeOverformyndareModal()">Avbryt</button>
							<button onclick="saveOverformyndare()">Spara Överförmyndare</button>
						</div>
					</div>
				</div>
				<div id="nyHuvudmanModal" class="modal">
					<div class="modal-content"> <span class="close-button" onclick="closeNyHuvudmanModal()">×</span>
						<h3>Lägg till Ny Huvudman</h3>
						<p>Fyll i uppgifterna för den nya huvudmannen.</p>
						<div class="input-group"><label for="newHmPnr">Personnummer (ÅÅÅÅMMDD-XXXX):*</label><input type="text" id="newHmPnr" required placeholder="Obligatorisk"></div>
						<div class="input-group"><label for="newHmFornamn">Förnamn:*</label><input type="text" id="newHmFornamn" required placeholder="Obligatorisk"></div>
						<div class="input-group"><label for="newHmEfternamn">Efternamn:*</label><input type="text" id="newHmEfternamn" required placeholder="Obligatorisk"></div>
						<div class="input-group"><label for="newHmAdress">Adress:</label><input type="text" id="newHmAdress"></div>
						<div class="input-group"><label for="newHmPostnr">Postnummer:</label><input type="text" id="newHmPostnr"></div>
						<div class="input-group"><label for="newHmPostort">Postort:</label><input type="text" id="newHmPostort"></div>
						<div class="input-group"><label for="newHmOverformyndareSelect">Tillhör Överförmyndare:</label><select id="newHmOverformyndareSelect">
								<option value="">-- Välj Överförmyndare --</option>
							</select></div>
						<div class="modal-buttons"> <button class="secondary" type="button" onclick="closeNyHuvudmanModal()">Avbryt</button> <button type="button" onclick="saveNewHuvudman()">Spara Ny Huvudman</button> </div>
					</div>
				</div>
				<div id="arvodesModal" class="modal" style="display:none;">
					<div class="modal-content">
						<span class="close-button" onclick="closeArvodesModal()">×</span>
						<h2>Arvodesberäkning</h2>
						<div>
							Huvudman: <span id="arvModalNamn"></span><br>
							Personnummer: <span id="arvModalPersonnummer"></span><br>
							Adress: <span id="arvModalAdress"></span><br>
							Postnummer: <span id="arvModalPostnummer"></span><br>
							Ort: <span id="arvModalOrt"></span><br>
						</div>
						<hr>
						<label>Arvode förvalta (kr): <input id="arvForvalta" type="number" oninput="beraknaArvode()"></label><br>
						<label>Arvode sörja (kr): <input id="arvSorja" type="number" oninput="beraknaArvode()"></label><br>
						<label>Arvode extra (kr): <input id="arvExtra" type="number" oninput="beraknaArvode()"></label><br>
						<label>Bilersättning (kr): <input id="arvBilersattning" type="number" oninput="beraknaArvode()"></label><br>

						<label>Kostnadsersättning (skattefri) (kr): <input id="arvKostnadsersattning" type="number" oninput="beraknaArvode()"></label><br>

						<label>Skattepliktig kostnadsersättning (kr): <input id="arvSkattepliktigKostnadsersattning" type="number" oninput="beraknaArvode()"></label><br>

						<label>Deklaration inskickad: <input id="arvDeklInskickad" type="text"></label><br>
						<hr>
						<strong>Bruttoarvode:</strong> <span id="arvSumma1"></span><br>
						<strong>Summa ersättning (skattefri):</strong> <span id="arvSummaErsattning"></span><br> <strong>Bruttoarvode (för uträkning):</strong> <span id="calcBruttoArvode"></span><br>
						<strong>Arvode efter skatt:</strong> <span id="calcArvodeEfterSkatt"></span><br>
						<strong>Arbetsgivaravgift:</strong> <span id="calcArbetsgivaravgift"></span><br>
						<strong>Avdragen skatt:</strong> <span id="calcAvdragenSkatt"></span><br>
						<strong>Utbetalt till ställföreträdare:</strong> <span id="calcTillStallforetradare"></span><br>
						<strong>Att betala till Skatteverket:</strong> <span id="calcTillSkatteverket"></span><br>
						<strong>OCR för Skatteverket:</strong> <span id="arvOCR"></span><br>
						<br>
						<div style="text-align: right; margin-top: 1.5em;">
							<button onclick="generateArvodePdf()">Skapa arvodesberäkning (PDF)</button>
							<button onclick="genereraSKV4805Pdf()">Förenklad arbetsgivardeklaration (PDF)</button>
							<button class="secondary" onclick="closeArvodesModal()">Stäng</button>
						</div>
					</div>
				</div>
				<div id="forsorjningsstodModal" class="modal">
					<div class="modal-content" style="max-width: 800px;"> <span class="close-button" onclick="closeForsorjningsstodModal()">×</span>
						<h3 id="forsorjningsstodModalTitle">Granska Uppgifter för Försörjningsstöd</h3>
						<p>Granska och komplettera uppgifterna nedan. De flesta hämtas från Huvudman-fliken.</p>
						<div class="form-grid">
							<div class="form-column">
								<h4>Ansökningsperiod & Handläggare</h4>
								<div class="input-group"><label for="fsModalAnsokanDatum">Ansökningsdatum:</label><input type="date" id="fsModalAnsokanDatum"></div>
								<div class="input-group"><label for="fsModalAnsokanAvserAr">Ansökan avser år:</label><input type="number" id="fsModalAnsokanAvserAr" placeholder="ÅÅÅÅ"></div>
								<div class="input-group"><label for="fsModalAnsokanAvserManad">Ansökan avser månad:</label><input type="text" id="fsModalAnsokanAvserManad" placeholder="T.ex. Januari"></div>
								<div class="input-group"><label>Kommunens handläggare (om känt):</label><span id="fsVisningKommunensHandlaggare" class="display-value"></span></div>
							</div>
							<div class="form-column">
								<h4>Sökande</h4>
								<div id="fsVisningPersonuppgifterContainer"></div>
							</div>
						</div>
						<hr>
						<div class="form-grid">
							<div class="form-column">
								<h4>Bostad</h4>
								<div id="fsVisningBostadContainer"></div>
							</div>
							<div class="form-column">
								<h4>Sysselsättning</h4>
								<div id="fsVisningSysselsattningContainer"></div>
							</div>
						</div>
						<hr>
						<div class="input-group"> <label for="fsAnsokanOvrigInfoHandlaggare_Modal">Övrig information till handläggare (specifikt för denna ansökan):</label> <textarea id="fsAnsokanOvrigInfoHandlaggare_Modal" rows="3"></textarea> </div>
						<div id="fsVisningOvrigInfoContainer" style="padding: 5px; border: 1px dashed #ccc; margin-bottom:10px; background-color: #f9f9f9;"> <small>Generella övriga upplysningar från Huvudman-fliken visas här.</small> </div>
						<hr>
						<div class="modal-buttons" style="margin-top: 20px;"> <button class="secondary" onclick="closeForsorjningsstodModal()">Avbryt</button> <button onclick="genereraOchLaddaNerForsorjningsstodPdf()">Generera PDF för <span id="fsModalKommunNamnKnapp2">Kommun</span></button> </div>
					</div>
				</div>

				<div id="ruleChoiceModal" class="modal">
					<div class="modal-content" style="max-width: 550px;">
						<h3 id="ruleChoiceModalTitle">Skapa Regel?</h3>
						<p id="ruleChoiceModalText" style="margin-bottom: 25px;"></p>

						<div class="modal-buttons" style="display: flex; justify-content: space-between; gap: 10px;">
							<button id="ruleChoiceCreate" class="primary">Ja, skapa/ändra regel...</button>

							<button id="ruleChoiceOnce" class="secondary">Nej, använd bara denna gång</button>

							<button id="ruleChoiceCancel" class="danger">Avbryt ändring</button>
						</div>
					</div>
				</div>

				<div id="ocrResultModal" class="modal">
					<div class="modal-content" style="max-width: 600px;">
						<span class="close-button" onclick="closeOcrResultModal()">×</span>
						<h3>Hittade data från faktura</h3>
						<p>Kontrollera uppgifterna nedan. Klicka "Använd Data" för att fylla i dem i formuläret.</p>
						<div id="ocrResultContainer" style="margin-top: 20px;">
						</div>
						<div class="modal-buttons">
							<button class="secondary" onclick="closeOcrResultModal()">Avbryt</button>
							<button id="useOcrDataButton">Använd Data</button>
						</div>
					</div>
				</div>

			</main>
		</div>
	</div>

	<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>

	<script src="libs/pdf-lib.min.js"></script>
	<script src="libs/fontkit.umd.js"></script>

	<script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.10.377/pdf.min.js"></script>
	<script src='https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js'></script>
	<script src="https://cdnjs.cloudflare.com/ajax/libs/PapaParse/5.3.0/papaparse.min.js"></script>
	<script src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.17.0/xlsx.full.min.js"></script>
	<script src="https://cdn.jsdelivr.net/npm/choices.js/public/assets/scripts/choices.min.js"></script>
	<script type="module" src="/js/main.js"></script>
	<!-- Gamla monoliten: avaktiverad -->
	<!-- <script src="godman_logic.js?v=<?php echo time(); ?>"></script> -->
</body>

</html>