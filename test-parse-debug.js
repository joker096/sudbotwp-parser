// Тестовый HTML из вопроса пользователя
const testHtml = `
<div id="content">
	<div id="line"></div>
<div align="center" class="title">
	Гражданские дела - апелляция</div>
<div id="line"></div>
<div align="center" class="casenumber">
	ДЕЛО № 33-1242/2026</div>
<ul class="tabs"><li id="tab1" class="nonsel"><a href="#" onclick="index(1, 4); return false;">&nbsp;ДЕЛО&nbsp;</a></li><li id="tab2" class="nonsel"><a href="#" onclick="index(2, 4); return false;">&nbsp;РАССМОТРЕНИЕ В НИЖЕСТОЯЩЕМ СУДЕ&nbsp;</a></li><li id="tab3" class="sel"><a href="#" onclick="index(3, 4); return false;">&nbsp;ДВИЖЕНИЕ ДЕЛА&nbsp;</a></li><li id="tab4" class="nonsel"><a href="#" onclick="index(4, 4); return false;">&nbsp;УЧАСТНИКИ&nbsp;</a></li></ul>
<div class="contentt" style="padding:0; margin:0;">
	<noscript>Javascript выключен.</noscript>
	<div id="cont1" style="display: none; padding: 0px 15px 15px;">
		<br><table width="100%" border="0" cellspacing="0" cellpadding="3" id="tablcont">
			<tbody><tr>
       			<th colspan="2" align="center" valign="center">ДЕЛО</th>
       		</tr><tr>
			            	</tr><tr>
					<td width="50%">
						<b>Уникальный идентификатор дела</b>					</td>
					<td><a style="font-size:12px;" href="/modules.php?name=sud_delo&name_op=r_juid&vnkod=47OS0000&srv_num=1&delo_id=5&case_type=0&judicial_uid=47RS0004-01-2023-011094-74"><u>47RS0004-01-2023-011094-74</u></a></td>
            	</tr>
			            	<tr>
					<td width="50%">
						<b>Дата поступления</b>					</td>
					<td>29.01.2026</td>
            	</tr>
			            	<tr>
					<td width="50%">
						<b>Категория дела</b>					</td>
					<td>Споры, возникающие из семейных правоотношений&nbsp;→<br>Споры, связанные с воспитанием детей</td>
            	</tr>
			            	<tr>
					<td width="50%">
						<b>Судья</b>					</td>
					<td>Степанова Елена Геннадьевна</td>
            	</tr>
			  				
   		</tbody></table>
	</div>
			<div id="cont2" style="display: none; padding: 0 15px 15px 15px;">
			<br><table width="100%" border="0" cellspacing="0" cellpadding="3" id="tablcont">
				<tbody><tr>
					<th colspan="2" align="center" valign="center">РАССМОТРЕНИЕ В НИЖЕСТОЯЩЕМ СУДЕ</th>
				</tr>
									<tr>
						<td width="50%">
							<b>Суд (судебный участок) первой инстанции</b>						</td>
						<td>Всеволожский городской суд</td>
					</tr>
										<tr>
						<td width="50%">
							<b>Номер дела в первой инстанции</b>						</td>
						<td>2-3981/2024 (2-12883/2023;) ~ М-8908/2023</td>
					</tr>
										<tr>
						<td width="50%">
							<b>Судья (мировой судья) первой инстанции</b>						</td>
						<td>Сошина Ольга Владимировна</td>
					</tr>
									
			</tbody></table>
		</div>
		<div id="cont3" style="display: block; padding: 0px 15px 15px;"><br><table width="100%" cellpadding="3" cellspacing="0" id="tablcont"><tbody><tr><th colspan="10">ДВИЖЕНИЕ ДЕЛА</th></tr><tr><td align="center"><b>Наименование события</b></td><td align="center"><b>Дата</b></td><td align="center"><b>Время</b></td><td align="center"><b>Место проведения</b></td><td align="center"><b>Результат события</b></td><td align="center"><b>Основание для выбранного результата события</b></td><td align="center"><b>Примечание</b></td><td align="center"><b>Дата размещения</b>&nbsp;<span class="tooltipShow"><img src="/images/help.gif"><span>Информация о размещении событий в движении дела предоставляется на основе сведений, хранящихся в учетной системе судебного делопроизводства</span></span></td></tr><tr><td>Передача дела судье</td><td>30.01.2026</td><td>14:36</td><td></td><td></td><td></td><td></td><td>30.01.2026</td></tr><tr><td>Судебное заседание</td><td>03.03.2026</td><td>12:50</td><td></td><td></td><td></td><td></td><td>10.02.2026</td></tr></tbody></table></div><div id="cont4" style="display: none; padding: 0 15px 15px 15px;"><br><table width="100%" cellpadding="3" cellspacing="0" id="tablcont"><tbody><tr><th colspan="10">УЧАСТНИКИ</th></tr><tr><td align="center"><b>Вид лица, участвующего в деле</b></td><td align="center"><b>Фамилия / наименование</b></td><td align="center"><b>ИНН</b></td><td align="center"><b>КПП</b></td><td align="center"><b>ОГРН</b></td><td align="center"><b>ОГРНИП</b></td></tr><tr><td>ТРЕТЬЕ ЛИЦО</td><td>Информация скрыта</td><td></td><td></td><td></td><td></td></tr><tr><td>ТРЕТЬЕ ЛИЦО</td><td>Информация скрыта</td><td></td><td></td><td></td><td></td></tr><tr><td>ИСТЕЦ</td><td>Информация скрыта</td><td></td><td></td><td></td><td></td></tr><tr><td>ОТВЕТЧИК</td><td>Информация скрыта</td><td></td><td></td><td></td><td></td></tr></tbody></table></div></div>
</div>
`;

console.log("Test HTML loaded, length:", testHtml.length);
console.log("Contains 'ДВИЖЕНИЕ ДЕЛА':", testHtml.includes("ДВИЖЕНИЕ ДЕЛА"));
console.log("Contains 'наименование события':", testHtml.toLowerCase().includes("наименование события"));
console.log("Contains '30.01.2026':", testHtml.includes("30.01.2026"));
console.log("Contains 'Передача дела судье':", testHtml.includes("Передача дела судье"));
