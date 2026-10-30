import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';
export default defineConfig({base:'./',plugins:[viteSingleFile()],build:{outDir:'dist-review',emptyOutDir:true,chunkSizeWarningLimit:1500},worker:{format:'iife'}});
