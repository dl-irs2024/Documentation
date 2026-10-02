const fs = require('fs');
const path = require('path');

// Find all plugin directories
const pluginsDir = path.join(__dirname, 'src', 'plugins');
const plugins = fs.readdirSync(pluginsDir).filter(f => {
  return fs.statSync(path.join(pluginsDir, f)).isDirectory();
});

// Build esbuild config for each plugin
const entryPoints = {};
plugins.forEach(plugin => {
  entryPoints[path.join('plugins', plugin, plugin)] = path.join(pluginsDir, plugin, 'index.ts');
});

require('esbuild').build({
  entryPoints,
  bundle: true,
  minify: process.env.NODE_ENV === 'production',
  sourcemap: true,
  outdir: path.join(__dirname, 'dist'),
  format: 'esm',
  splitting: true,
  external: ['react', 'react-dom', '@fluentui/react'],
  define: {
    'process.env.NODE_ENV': `"${process.env.NODE_ENV || 'development'}"`
  }
}).catch(() => process.exit(1));
