import fs from "fs";

let content = fs.readFileSync("src/components/GuidesTable.tsx", "utf-8");

// Add Copy icon import
content = content.replace(
  /import \{ RefreshCw, Search, Layers, CreditCard, Building, Hash, FileCheck, Trash2, ChevronDown, ChevronRight, Key \} from 'lucide-react';/,
  `import { RefreshCw, Search, Layers, CreditCard, Building, Hash, FileCheck, Trash2, ChevronDown, ChevronRight, Key, ArrowRightToLine, ArrowLeftToLine } from 'lucide-react';`
);

// Guia Prestador cell
const prestadorCellOld = `                      {/* Guia Prestador */}
                      <td className="py-1.5 px-2">
                        <input
                          type="text"
                          value={currentForm.guiaPrestador}
                          onChange={(e) => handleInputChange(guide.id, 'guiaPrestador', e.target.value)}
                          className="w-full bg-transparent border border-[#2d3235] hover:border-[#444] focus:border-[#00b4d8] rounded px-2 py-1 text-xs text-gray-200 focus:outline-none"
                        />
                      </td>`;

const prestadorCellNew = `                      {/* Guia Prestador */}
                      <td className="py-1.5 px-2">
                        <div className="relative group/input flex items-center">
                          <input
                            type="text"
                            value={currentForm.guiaPrestador}
                            onChange={(e) => handleInputChange(guide.id, 'guiaPrestador', e.target.value)}
                            className="w-full bg-transparent border border-[#2d3235] hover:border-[#444] focus:border-[#00b4d8] rounded px-2 py-1 pr-6 text-xs text-gray-200 focus:outline-none"
                          />
                          <button
                            title="Copiar do Nº Guia"
                            onClick={(e) => { e.preventDefault(); handleInputChange(guide.id, 'guiaPrestador', currentForm.guia); }}
                            className="absolute right-1 p-1 text-gray-500 hover:text-[#00b4d8] opacity-0 group-hover/input:opacity-100 transition-opacity bg-[#1e2224] rounded-sm"
                          >
                            <ArrowLeftToLine className="w-3 h-3" />
                          </button>
                        </div>
                      </td>`;

content = content.replace(prestadorCellOld, prestadorCellNew);

// Senha cell
const senhaCellOld = `                      {/* Senha */}
                      <td className="py-1.5 px-2">
                        <input
                          type="text"
                          value={currentForm.senha}
                          onChange={(e) => handleInputChange(guide.id, 'senha', e.target.value)}
                          className="w-full bg-transparent border border-[#2d3235] hover:border-[#444] focus:border-[#00b4d8] rounded px-2 py-1 text-xs text-gray-200 focus:outline-none"
                        />
                      </td>`;

const senhaCellNew = `                      {/* Senha */}
                      <td className="py-1.5 px-2">
                        <div className="relative group/input flex items-center">
                          <input
                            type="text"
                            value={currentForm.senha}
                            onChange={(e) => handleInputChange(guide.id, 'senha', e.target.value)}
                            className="w-full bg-transparent border border-[#2d3235] hover:border-[#444] focus:border-[#00b4d8] rounded px-2 py-1 pr-6 text-xs text-gray-200 focus:outline-none"
                          />
                          <button
                            title="Copiar do Nº Guia"
                            onClick={(e) => { e.preventDefault(); handleInputChange(guide.id, 'senha', currentForm.guia); }}
                            className="absolute right-1 p-1 text-gray-500 hover:text-[#00b4d8] opacity-0 group-hover/input:opacity-100 transition-opacity bg-[#1e2224] rounded-sm"
                          >
                            <ArrowLeftToLine className="w-3 h-3" />
                          </button>
                        </div>
                      </td>`;

content = content.replace(senhaCellOld, senhaCellNew);

// Guia cell
const guiaCellOld = `                      {/* Nº Guia */}
                      <td className="py-1.5 px-2">
                        <input
                          type="text"
                          value={currentForm.guia}
                          onChange={(e) => handleInputChange(guide.id, 'guia', e.target.value)}
                          className="w-full bg-transparent border border-[#2d3235] hover:border-[#444] focus:border-[#00b4d8] rounded px-2 py-1 text-xs text-gray-200 focus:outline-none"
                        />
                      </td>`;

const guiaCellNew = `                      {/* Nº Guia */}
                      <td className="py-1.5 px-2">
                        <div className="relative group/input flex items-center">
                          <button
                            title="Copiar da Senha"
                            onClick={(e) => { e.preventDefault(); handleInputChange(guide.id, 'guia', currentForm.senha); }}
                            className="absolute left-1 p-1 text-gray-500 hover:text-[#00b4d8] opacity-0 group-hover/input:opacity-100 transition-opacity bg-[#1e2224] rounded-sm z-10"
                          >
                            <ArrowRightToLine className="w-3 h-3" />
                          </button>
                          <input
                            type="text"
                            value={currentForm.guia}
                            onChange={(e) => handleInputChange(guide.id, 'guia', e.target.value)}
                            className="w-full bg-transparent border border-[#2d3235] hover:border-[#444] focus:border-[#00b4d8] rounded px-2 py-1 pl-6 text-xs text-gray-200 focus:outline-none"
                          />
                        </div>
                      </td>`;

content = content.replace(guiaCellOld, guiaCellNew);

fs.writeFileSync("src/components/GuidesTable.tsx", content);
console.log("GuidesTable patched for shortcuts");
