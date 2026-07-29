/* Local React 18.2.0 bootstrap for static hosting. */
(function bootstrapSunpathsReact(global) {
  "use strict";
  const modules = Object.create(null);
  const cache = Object.create(null);
  const chunkQueue = [];

  chunkQueue.push = function registerChunk(payload) {
    const definitions = payload && payload[1];
    if (definitions) Object.assign(modules, definitions);
    return Array.prototype.push.call(this, payload);
  };

  global.webpackChunk_jupyterlab_application_top = chunkQueue;
  global.__sunpathsReactRuntime = {
    require(id) {
      // The ReactDOM bundle asks JupyterLab's federation layer for React.
      // In this self-hosted build that module is the local React bundle.
      if (id === 44914) id = 96540;
      if (cache[id]) return cache[id].exports;
      const factory = modules[id];
      if (!factory) throw new Error(`Missing local React module ${id}.`);
      const module = { exports: {} };
      cache[id] = module;
      factory(module, module.exports, global.__sunpathsReactRuntime.require);
      return module.exports;
    },
    expose() {
      global.React = global.__sunpathsReactRuntime.require(96540);
      global.ReactDOM = global.__sunpathsReactRuntime.require(22551);
      if (!global.React?.useState || !global.ReactDOM?.createRoot) {
        throw new Error("The local React runtime did not initialise correctly.");
      }
    }
  };
})(globalThis);
