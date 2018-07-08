class MutationRecord {
  constructor(type, target, addedNodes, removedNodes, previousSibling, nextSibling, attributeName, attributeNamespace, oldValue) {
    this.type = type;
    this.target = target;
    this.addedNodes = addedNodes;
    this.removedNodes = removedNodes;
    this.previousSibling = previousSibling;
    this.nextSibling = nextSibling;
    this.attributeName = attributeName;
    this.attributeNamespace = attributeNamespace;
    this.oldValue = oldValue;
  }
}
module.exports.MutationRecord = MutationRecord;

class MutationObserver {
  constructor(callback) {
    this.callback = callback;

    this.element = null;
    this.options = null;
    this.queue = [];
    this.bindings = new WeakMap();
  }

  observe(element, options) {
    this.element = element;
    this.options = options;

    this.bind(element);
  }

  disconnect() {
    this.unbind(this.element);

    this.element = null;
    this.options = null;
  }

  takeRecords() {
    const oldQueue = this.queue.slice();
    this.queue.length = 0;
    return oldQueue;
  }

  bind(el) {
    const _bind = el => {
      let _attribute = null;
      let _children = null;
      let _value = null;

      if (this.options.attributes) {
        if (this.options.attributeFilter) {
          _attribute = (name, value) => {
            if (this.options.attributeFilter.includes(name)) {
              this.handleAttribute(el, name, value);
            }
          };
        } else {
          _attribute = (name, value) => {
            this.handleAttribute(el, name, value);
          };
        }
        el.on('attribute', _attribute);
      }

      _children = (addedNodes, removedNodes, previousSibling, nextSibling) => {
        // if (this.options.childList) {
          this.handleChildren(el, addedNodes, removedNodes, previousSibling, nextSibling);
        // }
        if (this.options.subtree) {
          for (let i = 0; i < removedNodes.length; i++) {
            this.unbind(removedNodes[i]);
          }
          for (let i = 0; i < addedNodes.length; i++) {
            this.bind(addedNodes[i]);
          }
        }
      };
      el.on('children', _children);

      if (this.options.characterData) {
        _value = () => {
          this.handleValue(el);
        }
        el.on('value', _value);
      }

      this.bindings.set(el, [
        _attribute,
        _children,
        _value,
      ]);
    };

    if (this.options.subtree) {
      el.traverse(_bind);
    } else {
      _bind(el);
    }
  }

  unbind(el) {
    const _unbind = el => {
      const bindings = this.bindings.get(el);
      if (bindings) {
        const [
          _attribute,
          _children,
          _value,
        ] = bindings;
        if (_attribute) {
          el.removeListener('attribute', _attribute);
        }
        if (_children) {
          el.removeListener('children', _children);
        }
        if (_value) {
          el.removeListener('value', _value);
        }
        this.bindings.delete(el);
      }
    };

    if (this.options.subtree) {
      el.traverse(_unbind);
    } else {
      _unbind(el);
    }
  }

  flush() {
    if (this.queue.length > 0) {
      const oldQueue = this.queue.slice();
      this.queue.length = 0;
      this.callback(oldQueue, this);
    }
  }

  handleAttribute(el, name, value, oldValue) {
    this.queue.push(new MutationRecord('attributes', el, null, null, null, null, name, null, oldValue));

    setImmediate(() => {
      this.flush();
    });
  }

  handleChildren(el, addedNodes, removedNodes, previousSibling, nextSibling) {
    this.queue.push(new MutationRecord('childList', el, addedNodes, removedNodes, previousSibling, nextSibling, null, null, null));

    setImmediate(() => {
      this.flush();
    });
  }

  handleValue(el) {
    this.queue.push(new MutationRecord('characterData', el, [], [], null, null, null, null, null));

    setImmediate(() => {
      this.flush();
    });
  }
}
module.exports.MutationObserver = MutationObserver;