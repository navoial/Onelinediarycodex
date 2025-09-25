import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/state/useToast'
import styles from './SettingsRoute.module.css'

type ExportFormat = 'json' | 'text'

type ButtonSpec = {
  format: ExportFormat
  label: string
  description: string
}

const BUTTONS: ButtonSpec[] = [
  { format: 'json', label: 'Download JSON', description: 'Full data archive' },
  { format: 'text', label: 'Download TXT', description: 'Readable snapshot' },
]

export default function SettingsExportRoute() {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [isExporting, setIsExporting] = useState<ExportFormat | null>(null)

  async function handleExport(format: ExportFormat) {
    if (!supabase) {
      showToast('Supabase client not configured.', 'error')
      return
    }

    setIsExporting(format)
    try {
      const { data, error } = await supabase.functions.invoke('exportData', {
        method: 'POST',
        body: { format },
      })
      if (error) {
        throw error
      }
      if (!data) {
        throw new Error('Empty export payload')
      }

      const timestamp = new Date().toISOString().replace(/[:]/g, '-')
      const filename = `onelinediary-export-${timestamp}.${format === 'text' ? 'txt' : 'json'}`
      const blob =
        format === 'text'
          ? new Blob([String(data)], { type: 'text/plain' })
          : new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })

      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
      showToast(`Your ${format.toUpperCase()} export has been downloaded.`)
    } catch (error) {
      console.error('Failed to export data', error)
      showToast('Export failed. Please try again.', 'error')
    } finally {
      setIsExporting(null)
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <button
          type="button"
          className={styles.backButton}
          onClick={() => navigate(-1)}
          aria-label="Go back"
        >
          <span aria-hidden="true">&larr;</span>
        </button>
        <h1 className={styles.title}>Export data</h1>
      </div>

      <section className={styles.section}>
        <div className={styles.exportCard}>
          <div className={styles.exportIcon} aria-hidden="true">
            📦
          </div>
          <div className={styles.exportCopy}>
            <p className={styles.helperText}>
              Download your journal history in the format that suits you best. JSON contains every stored field,
              while the TXT export is a quick, human-readable summary of your entries.
            </p>
            <ul className={styles.helperList}>
              <li>
                <strong>JSON</strong> &mdash; structured archive for migrating or backing up your data.
              </li>
              <li>
                <strong>TXT</strong> &mdash; easy to skim, perfect for printing or reading offline.
              </li>
            </ul>
          </div>
        </div>

        <div className={styles.buttonCluster}>
          {BUTTONS.map(({ format, label, description }) => {
            const buttonLabel = isExporting === format ? 'Preparing…' : label
            const variantClass =
              format === 'json' ? styles.exportPrimaryButton : styles.exportSecondaryButton

            return (
              <button
                key={format}
                type="button"
                className={`${styles.exportButton} ${variantClass} ${
                  isExporting === format ? styles.buttonLoading : ''
                }`}
                onClick={() => void handleExport(format)}
                disabled={isExporting !== null}
              >
                <span className={styles.buttonLabel}>{buttonLabel}</span>
                <span className={styles.buttonHint}>{description}</span>
              </button>
            )
          })}
        </div>
      </section>
    </div>
  )
}
