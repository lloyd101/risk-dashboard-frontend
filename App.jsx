import React, { useEffect, useState } from 'react';
import Plot from 'react-plotly.js';
import axios from 'axios';

/**
 * Frontend component for the Risk Scoring Dashboard.
 *
 * This component fetches applicant data from the FastAPI backend and
 * displays it on an interactive map.  A slider controls the weight
 * applied to the age feature in the underlying risk model.  When the
 * slider changes, the component fetches updated risk scores from
 * `/api/risk-scores` and updates the map accordingly.
 */
function App() {
  const [applicants, setApplicants] = useState([]);
  const [ageWeight, setAgeWeight] = useState(1.0);
  const [figData, setFigData] = useState({ data: [], layout: {} });

  // Base URL for the API.  In production set VITE_API_URL to your
  // backend URL (e.g. https://yourname-risk-dashboard.onrender.com)
  const baseURL = import.meta.env.VITE_API_URL || '';

  // Fetch baseline applicants on mount
  useEffect(() => {
    const fetchInitial = async () => {
      try {
        const res = await axios.get(`${baseURL}/api/applicants`);
        setApplicants(res.data);
        computeFigure(res.data, ageWeight);
      } catch (err) {
        console.error('Error fetching applicants', err);
      }
    };
    fetchInitial();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // When ageWeight changes, fetch recomputed risk scores
  useEffect(() => {
    const fetchWithWeight = async () => {
      try {
        const res = await axios.get(`${baseURL}/api/risk-scores`, {
          params: { age_weight: ageWeight },
        });
        setApplicants(res.data);
        computeFigure(res.data, ageWeight);
      } catch (err) {
        console.error('Error fetching weighted risk scores', err);
      }
    };
    // Only fetch if initial data is loaded
    if (applicants.length > 0) {
      fetchWithWeight();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ageWeight]);

  /**
   * Build the Plotly figure from applicant data and age weight.
   */
  const computeFigure = (data, weight) => {
    if (!data || data.length === 0) {
      return;
    }
    const lats = data.map((x) => x.lat);
    const lons = data.map((x) => x.lon);
    const risks = data.map((x) => x.risk_score);
    const ages = data.map((x) => x.age);
    const claims = data.map((x) => x.prior_claims);
    const credit = data.map((x) => x.credit_band);
    const geo = data.map((x) => x.geo_risk);
    const values = data.map((x) => x.asset_value);
    const center = {
      lat: lats.reduce((a, b) => a + b, 0) / lats.length,
      lon: lons.reduce((a, b) => a + b, 0) / lons.length,
    };
    setFigData({
      data: [
        {
          type: 'scattermapbox',
          lat: lats,
          lon: lons,
          mode: 'markers',
          marker: {
            size: 6,
            color: risks,
            colorscale: [
              [0.0, '#2dc937'],
              [0.5, '#e7b416'],
              [1.0, '#cc3232'],
            ],
            cmin: 0,
            cmax: 1,
            opacity: 0.8,
          },
          customdata: data.map((row) => [row.age, row.prior_claims, row.credit_band, row.geo_risk, row.asset_value, row.risk_score]),
          hovertemplate:
            'Age: %{customdata[0]:.0f}<br>' +
            'Prior Claims: %{customdata[1]:.0f}<br>' +
            'Credit Band: %{customdata[2]}<br>' +
            'Geo Risk: %{customdata[3]:.2f}<br>' +
            'Asset Value: $%{customdata[4]:,.0f}<br>' +
            'Risk Score: %{customdata[5]:.3f}<extra></extra>',
        },
      ],
      layout: {
        title: `Risk Scores (Age Weight ${weight.toFixed(2)}x)`,
        mapbox: {
          style: 'open-street-map',
          center: center,
          zoom: 9,
        },
        margin: { l: 20, r: 20, t: 40, b: 20 },
        height: 600,
      },
    });
  };

  return (
    <div style={{ maxWidth: '960px', margin: '0 auto', padding: '1rem' }}>
      <h1>Risk Scoring Dashboard</h1>
      <p>
        Adjust the age weight slider to see how emphasising or de‑emphasising
        applicant age affects risk scores.  Data shown here is synthetic.
      </p>
      <div style={{ marginBottom: '1rem' }}>
        <label htmlFor="ageWeight">
          Age Weight: <strong>{ageWeight.toFixed(2)}x</strong>
        </label>
        <input
          id="ageWeight"
          type="range"
          min="0.5"
          max="2.0"
          step="0.1"
          value={ageWeight}
          onChange={(e) => setAgeWeight(parseFloat(e.target.value))}
          style={{ width: '100%' }}
        />
      </div>
      <Plot
        data={figData.data}
        layout={figData.layout}
        style={{ width: '100%', height: '600px' }}
        useResizeHandler={true}
      />
    </div>
  );
}

export default App;