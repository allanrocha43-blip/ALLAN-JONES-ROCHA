const fs = require('fs');

let content = fs.readFileSync('src/components/GuidesTable.tsx', 'utf8');

const regex = /\{\/\* Guia Prestador \*\/\}(.|\n)*\{\/\* Action \*\/\}/gm;

const newTds = `{/* Guia Prestador */}
                      <td className="py-1.5 px-2">
                        <div className="relative group/input flex items-center">
                          <input
                            type="text"
                            value={currentForm.guiaPrestador}
                            onChange={(e) => handleInputChange(guide.id, 'guiaPrestador', e.target.value)}
                            className="w-full bg-transparent border border-border hover:border-[#444] focus:border-[#00b4d8] rounded px-2 py-1 pr-6 text-xs text-foreground focus:outline-none"
                            placeholder="Guia Prestador"
                          />
                          <button
                            title="Copiar para Senha e Guia Operadora"
                            onClick={(e) => { e.preventDefault(); handleBridgeSync(guide.id, 'guiaPrestador', currentForm.guiaPrestador); }}
                            className="absolute right-1 p-1 text-muted-foreground hover:text-primary opacity-0 group-hover/input:opacity-100 transition-opacity bg-surface-2 rounded-sm"
                          >
                            <Layers className="w-3 h-3" />
                          </button>
                        </div>
                      </td>

                      {/* Carteira */}
                      <td className="py-1.5 px-2">
                        <input
                          type="text"
                          value={currentForm.carteira}
                          onChange={(e) => handleInputChange(guide.id, 'carteira', e.target.value)}
                          className="w-full bg-transparent border border-border hover:border-[#444] focus:border-[#00b4d8] rounded px-2 py-1 text-xs text-foreground focus:outline-none"
                        />
                      </td>

                      {/* Senha */}
                      <td className="py-1.5 px-2">
                        <div className="relative group/input flex items-center">
                          <input
                            type="text"
                            value={currentForm.senha}
                            onChange={(e) => handleInputChange(guide.id, 'senha', e.target.value)}
                            className="w-full bg-transparent border border-border hover:border-[#444] focus:border-[#00b4d8] rounded px-2 py-1 pr-6 text-xs text-foreground focus:outline-none"
                            placeholder="Senha"
                          />
                          <button
                            title="Copiar para Guia Prestador e Guia Operadora"
                            onClick={(e) => { e.preventDefault(); handleBridgeSync(guide.id, 'senha', currentForm.senha); }}
                            className="absolute right-1 p-1 text-muted-foreground hover:text-primary opacity-0 group-hover/input:opacity-100 transition-opacity bg-surface-2 rounded-sm"
                          >
                            <Layers className="w-3 h-3" />
                          </button>
                        </div>
                      </td>

                      {/* Nº Guia */}
                      <td className="py-1.5 px-2">
                        <div className="relative group/input flex items-center">
                          <input
                            type="text"
                            value={currentForm.guia}
                            onChange={(e) => handleInputChange(guide.id, 'guia', e.target.value)}
                            className="w-full bg-transparent border border-border hover:border-[#444] focus:border-[#00b4d8] rounded px-2 py-1 pr-6 text-xs text-foreground focus:outline-none"
                            placeholder="Nº Guia"
                          />
                          <button
                            title="Copiar para Senha e Guia Prestador"
                            onClick={(e) => { e.preventDefault(); handleBridgeSync(guide.id, 'guia', currentForm.guia); }}
                            className="absolute right-1 p-1 text-muted-foreground hover:text-primary opacity-0 group-hover/input:opacity-100 transition-opacity bg-surface-2 rounded-sm"
                          >
                            <Layers className="w-3 h-3" />
                          </button>
                        </div>
                      </td>

                      {/* Action */}`;

content = content.replace(regex, newTds);

fs.writeFileSync('src/components/GuidesTable.tsx', content);
console.log('Fields replaced');
