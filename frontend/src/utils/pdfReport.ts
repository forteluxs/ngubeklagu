import type { AnalysisResult } from '../services/api'

export function generateForensicPDFReport(result: AnalysisResult) {
  const printWindow = window.open('', '_blank')
  if (!printWindow) {
    alert('Please allow popups to generate the PDF report.')
    return
  }

  const dateStr = new Date(result.analyzed_at || Date.now()).toLocaleString('id-ID', {
    dateStyle: 'full',
    timeStyle: 'medium',
  })

  const isLikelyAI = result.overall_ai_likelihood === 'likely'
  const isPossibleAI = result.overall_ai_likelihood === 'possible'

  const statusBadgeBg = isLikelyAI
    ? '#ef4444'
    : isPossibleAI
    ? '#f59e0b'
    : '#10b981'

  const statusText = isLikelyAI
    ? 'HIGH PROBABILITY OF AI SYNTHESIS'
    : isPossibleAI
    ? 'MODERATE AI ARTIFACTS DETECTED'
    : 'LIKELY HUMAN / STUDIO RECORDING'

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Forensic Report — ${result.filename}</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700;800&family=JetBrains+Mono:wght@400;600&display=swap');
        body {
          font-family: 'Inter', sans-serif;
          color: #0f172a;
          background: #fff;
          margin: 0;
          padding: 40px;
          line-height: 1.5;
        }
        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 2px solid #0f172a;
          padding-bottom: 20px;
          margin-bottom: 30px;
        }
        .logo {
          font-size: 22px;
          font-weight: 800;
          letter-spacing: -0.5px;
          color: #4f46e5;
        }
        .subtitle {
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 2px;
          color: #64748b;
          font-weight: 600;
        }
        .report-meta {
          text-align: right;
          font-size: 12px;
          color: #475569;
          font-family: 'JetBrains Mono', monospace;
        }
        .verdict-banner {
          background: ${statusBadgeBg};
          color: #ffffff;
          padding: 20px 24px;
          border-radius: 12px;
          margin-bottom: 30px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .verdict-title {
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 1.5px;
          font-weight: 600;
          opacity: 0.9;
        }
        .verdict-status {
          font-size: 20px;
          font-weight: 800;
          letter-spacing: -0.3px;
          margin-top: 4px;
        }
        .score-box {
          text-align: right;
          font-size: 36px;
          font-weight: 900;
          font-family: 'JetBrains Mono', monospace;
        }
        .section-title {
          font-size: 14px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 1px;
          color: #334155;
          border-bottom: 1px solid #e2e8f0;
          padding-bottom: 8px;
          margin-top: 30px;
          margin-bottom: 16px;
        }
        .grid-2 {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
        }
        .info-card {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          padding: 16px;
        }
        .info-label {
          font-size: 11px;
          color: #64748b;
          text-transform: uppercase;
          font-weight: 600;
        }
        .info-val {
          font-size: 14px;
          font-weight: 600;
          color: #0f172a;
          margin-top: 4px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 10px;
          font-size: 13px;
        }
        th {
          background: #f1f5f9;
          text-align: left;
          padding: 10px 12px;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 1px;
          color: #475569;
          border-bottom: 2px solid #cbd5e1;
        }
        td {
          padding: 10px 12px;
          border-bottom: 1px solid #e2e8f0;
        }
        .badge {
          display: inline-block;
          padding: 3px 8px;
          border-radius: 6px;
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
        }
        .badge-high { background: #fee2e2; color: #991b1b; }
        .badge-medium { background: #fef3c7; color: #92400e; }
        .badge-low { background: #d1fae5; color: #065f46; }
        .footer {
          margin-top: 50px;
          padding-top: 20px;
          border-top: 1px solid #e2e8f0;
          font-size: 11px;
          color: #94a3b8;
          display: flex;
          justify-content: space-between;
        }
        @media print {
          body { padding: 0; }
          .no-print { display: none; }
        }
      </style>
    </head>
    <body>
      <div class="no-print" style="margin-bottom: 20px; text-align: right;">
        <button onclick="window.print()" style="background: #4f46e5; color: white; border: none; padding: 10px 20px; border-radius: 8px; font-weight: 600; cursor: pointer;">
          🖨️ Print / Save as PDF
        </button>
      </div>

      <div class="header">
        <div>
          <div class="logo">NgubekLagu</div>
          <div class="subtitle">Forensic Audio Authenticity Certificate</div>
        </div>
        <div class="report-meta">
          <div>SCAN ID: ${result.scan_id.slice(0, 16)}</div>
          <div>DATE: ${dateStr}</div>
        </div>
      </div>

      <div class="verdict-banner">
        <div>
          <div class="verdict-title">AUTHENTICITY VERDICT</div>
          <div class="verdict-status">${statusText}</div>
        </div>
        <div class="score-box">
          ${result.overall_score.toFixed(1)}%
        </div>
      </div>

      <div class="section-title">Audio File Information</div>
      <div class="grid-2">
        <div class="info-card">
          <div class="info-label">Filename</div>
          <div class="info-val">${result.filename}</div>
        </div>
        <div class="info-card">
          <div class="info-label">Duration & Format</div>
          <div class="info-val">${result.duration_seconds.toFixed(2)}s (${result.channels === 2 ? 'Stereo' : 'Mono'}, ${result.sample_rate} Hz)</div>
        </div>
      </div>

      ${
        result.model_fingerprint
          ? `
      <div class="section-title">AI Model Architecture Fingerprint</div>
      <div class="info-card" style="margin-bottom: 20px;">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <div>
            <div class="info-label">Predicted Generative Model</div>
            <div class="info-val" style="font-size: 16px; color: #4f46e5;">${result.model_fingerprint.predicted_model}</div>
          </div>
          <span class="badge badge-high">${(result.model_fingerprint.confidence_score * 100).toFixed(0)}% Match</span>
        </div>
        <p style="font-size: 12px; color: #475569; margin-top: 8px; margin-bottom: 8px;">${result.model_fingerprint.description}</p>
        <div class="info-label" style="margin-top: 10px;">Matched Traits:</div>
        <ul style="font-size: 12px; color: #334155; margin: 4px 0; padding-left: 20px;">
          ${result.model_fingerprint.signature_traits.map((t) => `<li>${t}</li>`).join('')}
        </ul>
      </div>
      `
          : ''
      }

      <div class="section-title">Domain Analysis Breakdown</div>
      <table>
        <thead>
          <tr>
            <th>Domain</th>
            <th>Weight</th>
            <th>Score</th>
            <th>Detected Artifacts</th>
          </tr>
        </thead>
        <tbody>
          ${result.domain_results
            .filter((d) => d.active)
            .map(
              (d) => `
            <tr>
              <td><strong>${d.display_name}</strong></td>
              <td>${(d.weight * 100).toFixed(0)}%</td>
              <td><strong>${(d.score * 100).toFixed(0)}%</strong></td>
              <td>${d.artifacts.filter((a) => a.detected).length} of ${d.artifacts.length} detected</td>
            </tr>
          `
            )
            .join('')}
        </tbody>
      </table>

      <div class="footer">
        <div>Generated by NgubekLagu v${result.tool_version} AI Audio Forensic Engine</div>
        <div>Page 1 of 1</div>
      </div>

      <script>
        window.onload = function() {
          // Auto print on load
          // window.print();
        }
      </script>
    </body>
    </html>
  `

  printWindow.document.write(htmlContent)
  printWindow.document.close()
}
