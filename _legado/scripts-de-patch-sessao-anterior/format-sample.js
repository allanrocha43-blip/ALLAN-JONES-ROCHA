import format from 'xml-formatter';
import { SAMPLE_TISS_4_SADT } from './src/utils/sampleXmls.ts';

const formatted = format(SAMPLE_TISS_4_SADT, {
  indentation: '  ',
  collapseContent: true,
  lineSeparator: '\n'
});
console.log(formatted.split('\n').map((l, i) => `${i+1}: ${l}`).join('\n'));
