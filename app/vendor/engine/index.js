import ObjectProcessor from '../lib/obj.js';
import StringProcessor from '../lib/str.js';
import Compiler from './compiler.js';
import Template from './template.js';
import Traverse from './traverse.js';
import Expand from '../expand/index.js';

const processor = function (ref, state) {
  switch (true) {
    case ref.nodeType == 3:
      Expand.template(ref, state);
      Template.render(ref, state);
      break;
    case ref.nodeType == 8:
      break;
    default:
      Expand.attribute(ref, state);
      const { directive, events, normal } = Compiler.processor;
      const { worker } = Template;
      worker(ref, state, directive);
      worker(ref, state, events);
      worker(ref, state, normal);
      break;
  }
}
const rendering = function (ref, state) {
  const list = Compiler.processor.list;
  if (!list.matcher(ref)) {
    return false;
  }

  const condition = ref.getAttribute('i-for');
  const params = condition.split(' in ');
  const name = params[1].trim();
  let param = params[0];
  param = StringProcessor.ltrim(param, '(');
  param = StringProcessor.rtrim(param, ')');
  const chips = param.split(',');
  const key = chips[0].trim();
  const index = (chips[1] || '').trim();
  if (index) {
    ref.setAttribute('i-for-index', index);
  }
  ref.setAttribute('i-for-key', key);
  ref.setAttribute('i-for-name', name);
  ref.removeAttribute('i-for');

  Expand.list(ref, state);

  const parentRef = ref.parentNode;

  const { watcher } = list.compiler({
    ref, parentRef,
    refClone: ref.cloneNode(true),
    parentRefClone: parentRef.cloneNode(true)
  }, state);

  const observer = () => {
    watcher(() => {
      const res = Traverse.getTraversalTemplate(parentRef);
      let rawRefs = [];
      if (res.refs[state.id]) {
        rawRefs = res.refs[state.id].normal;
      } else {
        rawRefs = res.refs.unkind.normal;
      }
      for (let i = 0; i < rawRefs.length; i++) {
        const ref = rawRefs[i];
        processor(ref, state);
      }
    });
  }
  observer();
  state.watch[name] = ObjectProcessor.readAsArr(state.watch[name]);
  state.watch[name].push(observer);
}

module.exports = { processor, rendering };