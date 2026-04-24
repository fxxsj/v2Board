import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import vm from 'node:vm'

const ROOT = resolve(import.meta.dirname, '..')
const SOURCE_DIR = resolve(ROOT, '../../public/theme/default/assets/i18n')
const OUT_DIR = resolve(ROOT, 'src/locales')

const LANGS = ['zh-CN', 'en-US', 'ja-JP', 'vi-VN', 'ko-KR', 'zh-TW', 'fa-IR']

async function loadFromJs(lang) {
  const filePath = resolve(SOURCE_DIR, `${lang}.js`)
  const code = await readFile(filePath, 'utf8')

  const context = {
    window: {
      settings: {
        i18n: {},
      },
    },
  }

  vm.runInNewContext(code, context, { filename: filePath, timeout: 2000 })
  const dict = context.window?.settings?.i18n?.[lang]
  if (!dict || typeof dict !== 'object') {
    throw new Error(`Failed to extract i18n dictionary for ${lang} from ${filePath}`)
  }

  return dict
}

function sortKeys(obj) {
  return Object.fromEntries(Object.entries(obj).sort(([a], [b]) => a.localeCompare(b)))
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true })

  for (const lang of LANGS) {
    const dict = await loadFromJs(lang)
    const outPath = resolve(OUT_DIR, `${lang}.json`)
    const content = `${JSON.stringify(sortKeys(dict), null, 2)}\n`
    await writeFile(outPath, content, 'utf8')
    process.stdout.write(`synced ${lang} -> ${outPath}\n`)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})

