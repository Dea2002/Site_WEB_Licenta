import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
    plugins: [react()],
    build: {
        // 2) bump the warning limit up to 1 MB
        chunkSizeWarningLimit: 1024,

        rollupOptions: {
            // 3) manually split react-bootstrap (and react-dom, etc.) out
            output: {
                manualChunks(id) {
                    if (id.includes('node_modules/react-bootstrap')) {
                        return 'react-bootstrap'
                    }
                    if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) {
                        return 'react-vendor'
                    }
                    // you can add more libs here…
                }
            },

            // 1) filter out the module-level-directives warnings
            onwarn(warning, defaultWarn) {
                // suppress exactly the "Module level directives cause errors…" messages
                if (
                    warning.code === 'PARSING_ERROR' &&
                    /Module level directives cause errors/.test(warning.message)
                ) {
                    return
                }
                defaultWarn(warning)
            }
        }
    }
})
