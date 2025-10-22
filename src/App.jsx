import React, { useEffect, useState } from "react";
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'

const API_KEY = "ak_ed5417c84bdd1486233419682110645c386da77b4982f973";
const BASE_URL = "https://assessment.ksensetech.com/api";
function App() {
 const [patients, setPatients] = useState([]);
  const [alerts, setAlerts] = useState({ highRisk: [], fever: [], dataIssues: [] });
  const [loading, setLoading] = useState(false);
  const [submitResult, setSubmitResult] = useState(null);

  // --- Utility Functions ---
  const bpRisk = (bp) => {
    if (!bp) return 0;
    const [sysStr, diaStr] = bp.split("/");
    const sys = Number(sysStr);
    const dia = Number(diaStr);
    if (isNaN(sys) || isNaN(dia)) return 0;

    if (sys < 120 && dia < 80) return 1;
    if (sys >= 120 && sys < 130 && dia < 80) return 2;
    if ((sys >= 130 && sys < 140) || (dia >= 80 && dia < 90)) return 3;
    if (sys >= 140 || dia >= 90) return 4;
    return 0;
  };

  const tempRisk = (temp) => {
    const t = parseFloat(temp);
    if (isNaN(t)) return 0;
    if (t <= 99.5) return 0;
    if (t <= 100.9) return 1;
    if (t >= 101) return 2;
    return 0;
  };

  const ageRisk = (age) => {
    const a = Number(age);
    if (isNaN(a)) return 0;
    if (a < 40) return 1;
    if (a <= 65) return 1;
    if (a > 65) return 2;
    return 0;
  };

  // --- Fetch All Patients ---
  const fetchPatients = async () => {
    setLoading(true);
    const allPatients = [];
    let page = 1;
    let hasNext = true;

    while (hasNext) {
      try {
        const res = await fetch(`${BASE_URL}/patients?page=${page}&limit=5`, {
          headers: { "x-api-key": API_KEY }
        });
        if (res.status === 429) {
          await new Promise(r => setTimeout(r, 1000));
          continue;
        }
        if (!res.ok) throw new Error(`API error: ${res.status}`);
        const data = await res.json();
        allPatients.push(...data.data);
        hasNext = data.pagination.hasNext;
        page++;
      } catch (err) {
        console.error("Retrying due to error:", err.message);
      }
    }

    setPatients(allPatients);
    setLoading(false);
  };

  // --- Generate Alerts ---
  const generateAlerts = (patients) => {
    const highRisk = [];
    const fever = [];
    const dataIssues = [];

    patients.forEach(p => {
      const bp = bpRisk(p.blood_pressure);
      const temp = tempRisk(p.temperature);
      const age = ageRisk(p.age);
      const total = bp + temp + age;

      if (bp === 0 || temp === 0 || age === 0) dataIssues.push(p.patient_id);
      if (total >= 4) highRisk.push(p.patient_id);
      if (parseFloat(p.temperature) >= 99.6) fever.push(p.patient_id);
    });

    setAlerts({ highRisk, fever, dataIssues });
  };

  // --- Submit Assessment ---
  const submitAssessment = async () => {
    const res = await fetch(`${BASE_URL}/submit-assessment`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": API_KEY
      },
      body: JSON.stringify({
        high_risk_patients: alerts.highRisk,
        fever_patients: alerts.fever,
        data_quality_issues: alerts.dataIssues
      })
    });
    const data = await res.json();
    setSubmitResult(data);
  };

  // --- Effect: Fetch & Generate Alerts ---
  useEffect(() => {
    fetchPatients();
  }, []);

  useEffect(() => {
    if (patients.length > 0) generateAlerts(patients);
  }, [patients]);

  return (
    <div style={{ padding: "2rem", fontFamily: "Arial" }}>
      <h1>Healthcare Risk Assessment</h1>
      {loading ? (
        <p>Loading patients...</p>
      ) : (
        <>
          <h2>Alert Lists</h2>
          <p><strong>High Risk Patients:</strong> {alerts.highRisk.join(", ") || "None"}</p>
          <p><strong>Fever Patients:</strong> {alerts.fever.join(", ") || "None"}</p>
          <p><strong>Data Quality Issues:</strong> {alerts.dataIssues.join(", ") || "None"}</p>

          <button onClick={submitAssessment} style={{ marginTop: "1rem", padding: "0.5rem 1rem" }}>
            Submit Assessment
          </button>

          {submitResult && (
            <div style={{ marginTop: "1rem" }}>
              <h3>Submission Result</h3>
              <pre>{JSON.stringify(submitResult, null, 2)}</pre>
            </div>
          )}
        </>
      )}
    </div>
  );
}
export default App
