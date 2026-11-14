import React, { useEffect, useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid, ResponsiveContainer } from 'recharts';
import { DEPTS, SEMS, TYPES, YEARS, STATUSES, colorOf, DEFAULT_OFFICIALS } from './config';
import { calc, keyOf, avg, pct } from './calc';

const STORE = 'covertrack.v1';
const OFF = 'covertrack.officials.v1';
const FIELDS = ['dept', 'ay', 'sem', 'type', 'year', 'batch', 'name', 'code', 'cr', 'total', 'covered', 'lab', 'labTotal', 'labCovered'];
const today = () => new Date().toISOString().slice(0, 10);
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random()));
const blank = { dept: 'IT', ay: '', sem: SEMS[0], type: TYPES[0], year: 2, batch: '', name: '', code: '', cr: '', total: '', covered: '', lab: 'No', labTotal: '', labCovered: '', remarks: '' };

const Badge = ({ s }) => (s ? <span className="badge" style={{ background: colorOf(s) }}>{s}</span> : '–');

export default function App() {
  const [rows, setRows] = useState(() => { try { return JSON.parse(localStorage.getItem(STORE)) || []; } catch { return []; } });
  useEffect(() => localStorage.setItem(STORE, JSON.stringify(rows)), [rows]);
  const [off, setOff] = useState(() => { try { return { ...DEFAULT_OFFICIALS, ...JSON.parse(localStorage.getItem(OFF)) }; } catch { return DEFAULT_OFFICIALS; } });
  useEffect(() => localStorage.setItem(OFF, JSON.stringify(off)), [off]);
  const [tab, setTab] = useState('dashboard');
  const [form, setForm] = useState(null);
  const [viewId, setViewId] = useState('');
  const [f, setF] = useState({ ay: 'All', sem: 'All', type: 'All', dept: 'All', stage: 'All' });

  const data = useMemo(() => rows.map(calc), [rows]);
  const ays = useMemo(() => [...new Set(data.map((r) => r.ay).filter(Boolean))], [data]);
  const shown = data.filter((r) => ['ay', 'sem', 'type', 'dept', 'stage'].every((k) => f[k] === 'All' || r[k] === f[k]));

  const save = (r) => {
    setRows((p) => {
      const old = p.find((x) => x.id === r.id);
      const rec = old && FIELDS.some((k) => String(old[k] ?? '') !== String(r[k] ?? '')) ? { ...r, verified: null, approved: null } : r;
      return old ? p.map((x) => (x.id === r.id ? rec : x)) : [...p, rec];
    });
    setForm(null);
  };
  const sign = (id, kind) => {
    const r = rows.find((x) => x.id === id);
    const o = kind === 'verified' ? off.heads[r.dept] : off.dean;
    if (!o || !o.name.trim()) return window.alert(`Enter the ${kind === 'verified' ? 'department head' : 'dean'} name in the Officials tab first.`);
    setRows((p) => p.map((x) => (x.id === id ? { ...x, [kind]: { name: o.name.trim(), position: o.position, date: today() } } : x)));
  };
  const undo = (id, kind) => window.confirm(kind === 'verified' ? 'Remove the verification (and approval)?' : 'Remove the approval?') &&
    setRows((p) => p.map((x) => (x.id === id ? { ...x, approved: null, ...(kind === 'verified' ? { verified: null } : {}) } : x)));
  const del = (id) => window.confirm('Delete this record?') && setRows((p) => p.filter((x) => x.id !== id));
  const open = (id) => { setViewId(id); setTab('report'); };

  return (
    <div className="app">
      <header className="top">
        <div><h1>CoverTrack</h1><p>School of Computing · QA course coverage tracking</p></div>
        <nav>
          {[['dashboard', 'Dashboard'], ['records', 'Records'], ['report', 'Course report'], ['officials', 'Officials'], ['data', 'Import / Export']].map(([k, t]) => (
            <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{t}</button>
          ))}
        </nav>
      </header>
      {tab !== 'data' && tab !== 'officials' && (
        <div className="filters">
          {[['ay', 'Academic year', ays], ['dept', 'QA team', DEPTS], ['sem', 'Semester', SEMS], ['type', 'Report', TYPES], ['stage', 'Sign-off', ['Draft', 'Verified', 'Approved']]].map(([k, label, opts]) => (
            <label key={k}>{label}
              <select value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })}>
                <option>All</option>{opts.map((o) => <option key={o}>{o}</option>)}
              </select>
            </label>
          ))}
          <span className="grow" /><button className="ghost" onClick={() => window.print()}>Print</button>
        </div>
      )}
      <main>
        {tab === 'dashboard' && <Dashboard d={shown} />}
        {tab === 'records' && <Records d={shown} onNew={() => setForm(blank)} onEdit={(r) => setForm(r)} onDel={del} onOpen={open} onSign={sign} onUndo={undo} />}
        {tab === 'report' && <Report d={shown} id={viewId} setId={setViewId} />}
        {tab === 'officials' && <Officials off={off} setOff={setOff} />}
        {tab === 'data' && <DataTab rows={rows} data={data} setRows={setRows} />}
      </main>
      {form && <Form init={form} all={rows} onSave={save} onCancel={() => setForm(null)} />}
    </div>
  );
}

function Dashboard({ d }) {
  const groups = [...DEPTS.map((x) => [x, d.filter((r) => r.dept === x)]), ['All departments', d]];
  const chart = groups.slice(0, 3).map(([n, a]) => ({ name: n, Lecture: +((avg(a.map((r) => r.lec)) || 0) * 100).toFixed(1), Lab: +((avg(a.map((r) => r.labPct)) || 0) * 100).toFixed(1), Performance: +((avg(a.map((r) => r.perf)) || 0) * 100).toFixed(1) }));
  const n = (st) => d.filter((r) => r.stage === st).length;
  if (!d.length) return <p className="empty">No records match the filters. Add courses in Records or import the Excel sheets in Import / Export.</p>;
  return (
    <>
      <p className="meta">Approved by dean: {n('Approved')} · Verified, waiting for dean: {n('Verified')} · Draft, waiting for department head: {n('Draft')}</p>
      <h2>By QA team</h2>
      <div className="scroll"><table>
        <thead><tr><th>Department</th><th>Courses</th><th>Avg lecture</th><th>Avg lab</th><th>Avg performance</th>{STATUSES.map((s) => <th key={s} style={{ background: colorOf(s) }}>{s}</th>)}</tr></thead>
        <tbody>{groups.map(([n, a]) => (
          <tr key={n} className={n.startsWith('All') ? 'total' : ''}><td>{n}</td><td>{a.length}</td><td>{pct(avg(a.map((r) => r.lec)))}</td><td>{pct(avg(a.map((r) => r.labPct)))}</td><td>{pct(avg(a.map((r) => r.perf)))}</td>
            {STATUSES.map((s) => <td key={s}>{a.filter((r) => r.status === s).length}</td>)}</tr>))}
        </tbody></table></div>
      <h2>Average performance by year of study</h2>
      <div className="scroll"><table>
        <thead><tr><th>Department</th>{YEARS.map((y) => <th key={y}>Year {y}</th>)}</tr></thead>
        <tbody>{groups.map(([n, a]) => (
          <tr key={n} className={n.startsWith('All') ? 'total' : ''}><td>{n}</td>{YEARS.map((y) => <td key={y}>{pct(avg(a.filter((r) => +r.year === y).map((r) => r.perf)))}</td>)}</tr>))}
        </tbody></table></div>
      <h2>Coverage and performance by department (%)</h2>
      <div className="chart"><ResponsiveContainer width="100%" height={280}>
        <BarChart data={chart}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" /><YAxis domain={[0, 100]} /><Tooltip /><Legend />
          <Bar dataKey="Lecture" fill="#0f766e" /><Bar dataKey="Lab" fill="#d97706" /><Bar dataKey="Performance" fill="#1e3a5f" /></BarChart>
      </ResponsiveContainer></div>
    </>
  );
}

function Records({ d, onNew, onEdit, onDel, onOpen, onSign, onUndo }) {
  const [q, setQ] = useState('');
  const list = d.filter((r) => `${r.name} ${r.code} ${r.batch}`.toLowerCase().includes(q.toLowerCase()));
  return (
    <>
      <div className="bar"><input placeholder="Search course name, code or batch" value={q} onChange={(e) => setQ(e.target.value)} /><button onClick={onNew}>Add course report</button></div>
      {!list.length ? <p className="empty">No course reports yet. Select “Add course report” to enter the first one.</p> : (
        <div className="scroll"><table>
          <thead><tr><th>Team</th><th>Year</th><th>Batch</th><th>Course</th><th>Code</th><th>CrHr</th><th>Report</th><th>Chapters</th><th>Lecture</th><th>Labs</th><th>Lab</th><th>Performance</th><th>Status</th><th>Sign-off</th><th /></tr></thead>
          <tbody>{list.map((r) => (
            <tr key={r.id}><td>{r.dept}</td><td>{r.year}</td><td>{r.batch}</td><td>{r.name}</td><td>{r.code}</td><td>{r.cr}</td><td>{r.type}<br /><small>{r.ay} · {r.sem}</small></td>
              <td>{r.covered}/{r.total}</td><td>{pct(r.lec)}</td><td>{r.lab === 'Yes' ? `${r.labCovered}/${r.labTotal}` : 'None'}</td><td>{pct(r.labPct)}</td><td><b>{pct(r.perf)}</b></td><td><Badge s={r.status} /></td><td><span className={`stage ${r.stage}`}>{r.stage}</span>{r.verified && <small><br />Verified: {r.verified.name}</small>}{r.approved && <small><br />Approved: {r.approved.name}</small>}</td>
              <td className="act">{!r.verified && <button onClick={() => onSign(r.id, 'verified')}>Verify</button>}{r.verified && !r.approved && <button onClick={() => onSign(r.id, 'approved')}>Approve</button>}{r.verified && <button className="ghost" onClick={() => onUndo(r.id, r.approved ? 'approved' : 'verified')}>Undo</button>}<button className="ghost" onClick={() => onOpen(r.id)}>View</button><button className="ghost" onClick={() => onEdit(r)}>Edit</button><button className="ghost danger" onClick={() => onDel(r.id)}>Delete</button></td></tr>))}
          </tbody></table></div>)}
    </>
  );
}

function Form({ init, all, onSave, onCancel }) {
  const [r, setR] = useState(init);
  const [err, setErr] = useState('');
  const set = (k) => (e) => setR({ ...r, [k]: e.target.value });
  const labOn = r.lab === 'Yes';
  const submit = (e) => {
    e.preventDefault();
    const n = (v) => (v === '' ? NaN : +v);
    if (!(n(r.total) >= 1)) return setErr('Total chapters must be 1 or more.');
    if (!(n(r.covered) >= 0 && n(r.covered) <= n(r.total))) return setErr('Chapters covered must be between 0 and total chapters.');
    if (labOn && !(n(r.labTotal) >= 0 && n(r.labCovered) >= 0 && n(r.labCovered) <= n(r.labTotal))) return setErr('Labs covered must be between 0 and total lab sessions.');
    const rec = { ...r, id: r.id || uid(), ...(labOn ? {} : { labTotal: '', labCovered: '' }) };
    if (all.some((x) => x.id !== rec.id && keyOf(x) === keyOf(rec))) return setErr('This course already has a report for the same team, year, semester, report type and batch.');
    onSave(rec);
  };
  const T = (k, label, extra = {}) => <label>{label}<input value={r[k]} onChange={set(k)} required {...extra} /></label>;
  const S = (k, label, opts) => <label>{label}<select value={r[k]} onChange={set(k)}>{opts.map((o) => <option key={o}>{o}</option>)}</select></label>;
  return (
    <div className="modal"><form onSubmit={submit}>
      <h2>{init.id ? 'Edit course report' : 'Add course report'}</h2>
      <div className="grid">
        {S('dept', 'QA team', DEPTS)}{T('ay', 'Academic year (E.C.)', { placeholder: '2019 E.C.' })}{S('sem', 'Semester', SEMS)}{S('type', 'Report type', TYPES)}
        {S('year', 'Year of study', YEARS)}{T('batch', 'Batch')}{T('name', 'Course name')}{T('code', 'Course code')}
        {T('cr', 'Total CrHr', { type: 'number', min: 0, step: '0.5' })}{T('total', 'Total chapters', { type: 'number', min: 1 })}{T('covered', 'Chapters covered', { type: 'number', min: 0 })}
        {S('lab', 'Lab available?', ['Yes', 'No'])}
        <label>Total lab sessions<input type="number" min="0" value={labOn ? r.labTotal : ''} onChange={set('labTotal')} disabled={!labOn} required={labOn} /></label>
        <label>Labs covered<input type="number" min="0" value={labOn ? r.labCovered : ''} onChange={set('labCovered')} disabled={!labOn} required={labOn} /></label>
        <label className="wide">Remarks<input value={r.remarks} onChange={set('remarks')} /></label>
      </div>
      {err && <p className="error">{err}</p>}
      {init.verified && <p className="meta">Changing the course data will remove the verification and approval.</p>}
      <div className="bar end"><button type="button" className="ghost" onClick={onCancel}>Cancel</button><button type="submit">Save course report</button></div>
    </form></div>
  );
}

function Report({ d, id, setId }) {
  const r = d.find((x) => x.id === id);
  const Bar1 = ({ label, v }) => (<div className="pb"><span>{label}</span><div><i style={{ width: `${(v || 0) * 100}%` }} /></div><b>{pct(v)}</b></div>);
  return (
    <>
      <div className="bar"><select value={id} onChange={(e) => setId(e.target.value)}>
        <option value="">Select a course report…</option>
        {d.map((x) => <option key={x.id} value={x.id}>{x.dept} · {x.code} · {x.name} · {x.type} {x.ay} {x.sem} · Batch {x.batch}</option>)}
      </select></div>
      {!r ? <p className="empty">Select a course report to see its full coverage report.</p> : (
        <section className="sheet">
          <h2>{r.name} <small>{r.code}</small></h2>
          <p className="meta">{r.dept} · Year {r.year} · Batch {r.batch} · {r.cr} CrHr · {r.type} report, {r.sem}, {r.ay}</p>
          <div className="cards">
            <div><b>Lecture</b><p>{r.covered} of {r.total} chapters covered</p><p>{r.remaining} remaining</p></div>
            <div><b>Lab</b>{r.lab === 'Yes' ? <><p>{r.labCovered} of {r.labTotal} sessions covered</p><p>{r.labRemaining} remaining</p></> : <p>No lab for this course</p>}</div>
            <div><b>Result</b><p>Performance rate <strong>{pct(r.perf)}</strong></p><Badge s={r.status} /></div>
          </div>
          <Bar1 label="Lecture coverage" v={r.lec} />{r.lab === 'Yes' && <Bar1 label="Lab coverage" v={r.labPct} />}<Bar1 label="Performance rate" v={r.perf} />
          {r.remarks && <p className="meta">Remarks: {r.remarks}</p>}
          <div className="sign">{[['verified', 'Verified by', 'Department Head'], ['approved', 'Approved by', 'Dean']].map(([k, t, role]) => (
            <div key={k}><b>{t} ({role})</b>
              {r[k] ? <><p className="nm">{r[k].name}</p><p>{r[k].position}</p><p>Date: {r[k].date}</p></> : <p className="pending">Pending</p>}
              <div className="line">Signature</div></div>))}</div>
        </section>)}
    </>
  );
}

function DataTab({ rows, data, setRows }) {
  const [msg, setMsg] = useState('');
  const str = (v) => String(v ?? '').trim();
  const onFile = async (e) => {
    const file = e.target.files[0]; if (!file) return;
    try {
      const wb = XLSX.read(await file.arrayBuffer());
      const ws = wb.Sheets.QA_Report || wb.Sheets[wb.SheetNames[0]];
      const a = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' }).slice(5); // data starts on row 6
      const inc = a.filter((c) => str(c[7])).map((c) => ({ id: uid(), dept: str(c[1]), ay: str(c[2]), sem: str(c[3]), type: str(c[4]), year: c[5], batch: str(c[6]), name: str(c[7]), code: str(c[8]), cr: c[9], total: c[10], covered: c[11], lab: str(c[14]) === 'Yes' ? 'Yes' : 'No', labTotal: c[15], labCovered: c[16], remarks: str(c[21]) }));
      const map = new Map(rows.map((r) => [keyOf(r), r]));
      let added = 0, updated = 0;
      inc.forEach((r) => {
        const k = keyOf(r), o = map.get(k);
        if (o) {
          r.id = o.id; updated++;
          if (['total', 'covered', 'lab', 'labTotal', 'labCovered'].every((x) => String(o[x] ?? '') === String(r[x] ?? ''))) { r.verified = o.verified; r.approved = o.approved; }
        } else added++;
        map.set(k, r);
      });
      setRows([...map.values()]);
      setMsg(`Imported ${inc.length} rows from “${file.name}”: ${added} added, ${updated} updated.`);
    } catch (x) { setMsg('Could not read this file. Use the QA workbook (.xlsx) with the QA_Report sheet.'); }
    e.target.value = '';
  };
  const exportXlsx = () => {
    const out = data.map((r, i) => ({ No: i + 1, 'QA Team': r.dept, 'Academic Year': r.ay, Semester: r.sem, 'Report Type': r.type, 'Year of Study': r.year, Batch: r.batch, 'Course Name': r.name, 'Course Code': r.code, CrHr: r.cr, 'Total Chapters': r.total, 'Chapters Covered': r.covered, 'Chapters Remaining': r.remaining, 'Lecture %': r.lec == null ? '' : r.lec, 'Lab Available': r.lab, 'Total Labs': r.labTotal, 'Labs Covered': r.labCovered, 'Labs Remaining': r.labRemaining ?? '', 'Lab %': r.labPct ?? '', 'Performance Rate': r.perf ?? '', Status: r.status, Remarks: r.remarks, 'Sign-off': r.stage, 'Verified By': r.verified?.name ?? '', 'Verifier Position': r.verified?.position ?? '', 'Verified Date': r.verified?.date ?? '', 'Approved By': r.approved?.name ?? '', 'Approver Position': r.approved?.position ?? '', 'Approved Date': r.approved?.date ?? '' }));
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(out), 'Report'); XLSX.writeFile(wb, 'CoverTrack_Report.xlsx');
  };
  return (
    <div className="sheet">
      <h2>Import QA Excel sheets</h2>
      <p>Each QA team fills the Excel workbook. Import every team’s file here; matching reports (same team, year, semester, report type, course code and batch) are updated, new ones are added.</p>
      <div className="bar"><input type="file" accept=".xlsx,.xls" onChange={onFile} /><a className="btn" href="./QA_Template.xlsx" download>Download Excel template</a></div>
      {msg && <p className="ok">{msg}</p>}
      <h2>Export</h2>
      <p>{rows.length} course reports stored in this browser.</p>
      <div className="bar"><button onClick={exportXlsx} disabled={!rows.length}>Export report to Excel</button>
        <button className="ghost danger" disabled={!rows.length} onClick={() => window.confirm('Delete ALL records from this browser?') && setRows([])}>Clear all data</button></div>
    </div>
  );
}

function Officials({ off, setOff }) {
  const up = (who, k, v) => setOff(who === 'dean' ? { ...off, dean: { ...off.dean, [k]: v } } : { ...off, heads: { ...off.heads, [who]: { ...off.heads[who], [k]: v } } });
  const list = [['dean', 'Dean (approves)', off.dean], ...DEPTS.map((x) => [x, `Department head, ${x} (verifies)`, off.heads[x]])];
  return (
    <div className="sheet">
      <h2>Officials</h2>
      <p>These names and positions are stamped on a course report when it is verified or approved. They save automatically in this browser.</p>
      {list.map(([k, label, o]) => (
        <div className="grid off" key={k}><b className="wide">{label}</b>
          <label>Name<input value={o.name} onChange={(e) => up(k, 'name', e.target.value)} placeholder="Full name" /></label>
          <label>Position<input value={o.position} onChange={(e) => up(k, 'position', e.target.value)} /></label></div>))}
    </div>
  );
}
