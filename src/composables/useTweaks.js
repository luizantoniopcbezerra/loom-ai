import { reactive } from 'vue'

export function useTweaks(defaults) {
  const tweaks = reactive({ ...defaults })

  function setTweak(key, value) {
    tweaks[key] = value
    window.parent?.postMessage({ type: '__edit_mode_set_keys', edits: { [key]: value } }, '*')
    window.dispatchEvent(new CustomEvent('tweakchange', { detail: { [key]: value } }))
  }

  return { tweaks, setTweak }
}
