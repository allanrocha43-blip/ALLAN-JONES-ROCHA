import { aplicarCorrecoesSegurasRecursivo } from './src/utils/tissAuditor';

const xml = `
<ans:mensagemTISS>
  <ans:observacao></ans:observacao>
  <ans:teste />
</ans:mensagemTISS>
`;

const res = aplicarCorrecoesSegurasRecursivo(xml);
console.log(JSON.stringify(res.novoConteudo));
