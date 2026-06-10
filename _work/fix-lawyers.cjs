const fs = require('fs');
const file = 'F:/AISTUDIO/sud.cvr.name/src/pages/Lawyers.tsx';
let content = fs.readFileSync(file, 'utf8');

const oldBlock = `                  {/* ────── EXTRA DATA ────── */}
                  <AnimatePresence>
                    {showExtraData && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="mt-4 space-y-3">
                          {/* Описание */}
                          {selectedLawyer.description && (
                            <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl">
                              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{selectedLawyer.description}</p>
                            </div>
                          )}

                          {/* Контакты */}
                          <div className="grid grid-cols-2 gap-3 pt-2">
                            {selectedLawyer.phone && (
                              <a href={\`tel:\${selectedLawyer.phone}\`} className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl flex items-center gap-3 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors group">
                                <div className="bg-white dark:bg-slate-700 p-2.5 rounded-xl shadow-sm group-hover:shadow-md transition-shadow">
                                  <Phone className="w-4 h-4 text-accent" />
                                </div>
                                <div className="overflow-hidden">
                                  <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">Телефон</p>
                                  <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{selectedLawyer.phone}</p>
                                </div>
                              </a>
                            )}
                            {selectedLawyer.website && (
                              <SafeLink href={formatUrl(selectedLawyer.website)} className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl flex items-center gap-3 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors group">
                                <div className="bg-white dark:bg-slate-700 p-2.5 rounded-xl shadow-sm group-hover:shadow-md transition-shadow">
                                  <Globe className="w-4 h-4 text-accent" />
                                </div>
                                <div className="overflow-hidden">
                                  <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">Сайт</p>
                                  <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{selectedLawyer.website}</p>
                                </div>
                              </SafeLink>
                            )}
                          </div>

                          {selectedLawyer.email && (
                            <a href={\`mailto:\${selectedLawyer.email}\`} className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-2xl flex items-center gap-3 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors group">
                              <div className="bg-white dark:bg-slate-700 p-2.5 rounded-xl shadow-sm">
                                <Mail className="w-4 h-4 text-accent" />
                              </div>
                              <div className="overflow-hidden">
                                <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">Email</p>
                                <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{selectedLawyer.email}</p>
                              </div>
                            </a>
                          )}

                          {selectedLawyer.telegram && (
                            <SafeLink href={\`https://t.me/\${selectedLawyer.telegram.replace(/^@/, '')}\`} className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-2xl flex items-center gap-3 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors group">
                              <div className="bg-white dark:bg-slate-700 p-2.5 rounded-xl shadow-sm">
                                <MessageCircle className="w-4 h-4 text-accent" />
                              </div>
                              <div className="overflow-hidden">
                                <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">Telegram</p>
                                <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{selectedLawyer.telegram}</p>
                              </div>
                            </SafeLink>
                          )}

                          {/* Доп. поля */}
                          <div className="grid grid-cols-2 gap-3">
                            {selectedLawyer.license_number && (
                              <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl flex flex-col items-center text-center">
                                <ShieldCheck className="w-5 h-5 text-emerald-500 mb-1.5" />
                                <p className="text-sm font-bold text-slate-900 dark:text-white">{selectedLawyer.license_number}</p>
                                <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider mt-0.5">Лицензия</p>
                              </div>
                            )}
                            {selectedLawyer.experience_years !== undefined && selectedLawyer.experience_years !== null && (
                              <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl flex flex-col items-center text-center">
                                <Briefcase className="w-5 h-5 text-emerald-500 mb-1.5" />
                                <p className="text-sm font-bold text-slate-900 dark:text-white">{selectedLawyer.experience_years}</p>
                                <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider mt-0.5">Лет опыта</p>
                              </div>
                            )}
                          </div>

                          {selectedLawyer.practice_areas && selectedLawyer.practice_areas.length > 0 && (
                            <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl">
                              <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider mb-2">Сферы практики</p>
                              <div className="flex flex-wrap gap-2">
                                {selectedLawyer.practice_areas.map((area) => (
                                  <span key={area} className="px-3 py-1 bg-white dark:bg-slate-700 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-300 shadow-sm">
                                    {area}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {selectedLawyer.languages && selectedLawyer.languages.length > 0 && (
                            <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl">
                              <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider mb-2">Языки</p>
                              <div className="flex flex-wrap gap-2">
                                {selectedLawyer.languages.map((lang) => (
                                  <span key={lang} className="px-3 py-1 bg-white dark:bg-slate-700 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-300 shadow-sm">
                                    {lang}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          <button
                            onClick={() => setShowExtraData(false)}
                            className="w-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 py-3 rounded-2xl text-sm font-bold transition-colors flex items-center justify-center gap-2"
                          >
                            <EyeOff className="w-4 h-4" />
                            Скрыть данные
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>`;

if (!content.includes(oldBlock)) {
  console.error('Old block not found');
  process.exit(1);
}

const newBlock = `                  {/* ────── КОНТАКТЫ (всегда видны) ────── */}
                  <div className="grid grid-cols-2 gap-3 mt-5 pt-2">
                    {selectedLawyer.phone && (
                      <a href={\`tel:\${selectedLawyer.phone}\`} className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl flex items-center gap-3 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors group">
                        <div className="bg-white dark:bg-slate-700 p-2.5 rounded-xl shadow-sm group-hover:shadow-md transition-shadow">
                          <Phone className="w-4 h-4 text-accent" />
                        </div>
                        <div className="overflow-hidden">
                          <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">Телефон</p>
                          <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{selectedLawyer.phone}</p>
                        </div>
                      </a>
                    )}
                    {selectedLawyer.website && (
                      <SafeLink href={formatUrl(selectedLawyer.website)} className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl flex items-center gap-3 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors group">
                        <div className="bg-white dark:bg-slate-700 p-2.5 rounded-xl shadow-sm group-hover:shadow-md transition-shadow">
                          <Globe className="w-4 h-4 text-accent" />
                        </div>
                        <div className="overflow-hidden">
                          <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">Сайт</p>
                          <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{selectedLawyer.website}</p>
                        </div>
                      </SafeLink>
                    )}
                  </div>

                  {selectedLawyer.email && (
                    <a href={\`mailto:\${selectedLawyer.email}\`} className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-2xl flex items-center gap-3 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors group mt-3">
                      <div className="bg-white dark:bg-slate-700 p-2.5 rounded-xl shadow-sm">
                        <Mail className="w-4 h-4 text-accent" />
                      </div>
                      <div className="overflow-hidden">
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">Email</p>
                        <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{selectedLawyer.email}</p>
                      </div>
                    </a>
                  )}

                  {/* ────── EXTRA DATA ────── */}
                  {showExtraData && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-4 space-y-3"
                    >
                      {selectedLawyer.description && (
                        <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl">
                          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{selectedLawyer.description}</p>
                        </div>
                      )}

                      {selectedLawyer.telegram && (
                        <SafeLink href={\`https://t.me/\${selectedLawyer.telegram.replace(/^@/, '')}\`} className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-2xl flex items-center gap-3 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors group">
                          <div className="bg-white dark:bg-slate-700 p-2.5 rounded-xl shadow-sm">
                            <MessageCircle className="w-4 h-4 text-accent" />
                          </div>
                          <div className="overflow-hidden">
                            <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">Telegram</p>
                            <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{selectedLawyer.telegram}</p>
                          </div>
                        </SafeLink>
                      )}

                      <div className="grid grid-cols-2 gap-3">
                        {selectedLawyer.license_number && (
                          <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl flex flex-col items-center text-center">
                            <ShieldCheck className="w-5 h-5 text-emerald-500 mb-1.5" />
                            <p className="text-sm font-bold text-slate-900 dark:text-white">{selectedLawyer.license_number}</p>
                            <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider mt-0.5">Лицензия</p>
                          </div>
                        )}
                        {selectedLawyer.experience_years !== undefined && selectedLawyer.experience_years !== null && (
                          <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl flex flex-col items-center text-center">
                            <Briefcase className="w-5 h-5 text-emerald-500 mb-1.5" />
                            <p className="text-sm font-bold text-slate-900 dark:text-white">{selectedLawyer.experience_years}</p>
                            <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider mt-0.5">Лет опыта</p>
                          </div>
                        )}
                      </div>

                      {selectedLawyer.practice_areas && selectedLawyer.practice_areas.length > 0 && (
                        <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl">
                          <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider mb-2">Сферы практики</p>
                          <div className="flex flex-wrap gap-2">
                            {selectedLawyer.practice_areas.map((area) => (
                              <span key={area} className="px-3 py-1 bg-white dark:bg-slate-700 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-300 shadow-sm">
                                {area}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {selectedLawyer.languages && selectedLawyer.languages.length > 0 && (
                        <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl">
                          <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider mb-2">Языки</p>
                          <div className="flex flex-wrap gap-2">
                            {selectedLawyer.languages.map((lang) => (
                              <span key={lang} className="px-3 py-1 bg-white dark:bg-slate-700 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-300 shadow-sm">
                                {lang}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      <button
                        onClick={() => setShowExtraData(false)}
                        className="w-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 py-3 rounded-2xl text-sm font-bold transition-colors flex items-center justify-center gap-2"
                      >
                        <EyeOff className="w-4 h-4" />
                        Скрыть данные
                      </button>
                    </motion.div>
                  )}`;

content = content.replace(oldBlock, newBlock);
fs.writeFileSync(file, content, 'utf8');
console.log('Done');
