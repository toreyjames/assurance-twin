export const handler = async (event) => {
  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    },
    body: JSON.stringify({
      working: true,
      kpis: {
        engineering_total: 6,
        network_coverage_pct_est: 50,
        missing_on_network_est: 3,
        orphans_on_network: 1,
        outdated_high_assets_est: 2
      },
      rows: [],
      reportHtml: '<html><body><h1>Working!</h1></body></html>'
    })
  }
}
