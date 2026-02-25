"use client";

import React, { useState } from 'react';
import Papa from 'papaparse';
import api from '@/lib/api';

type WizardStep = 'upload' | 'preview' | 'map' | 'confirm' | 'progress' | 'complete';

const INTERNAL_FIELDS = [
  { key: 'name', label: 'Card Name (Required)' },
  { key: 'set', label: 'Set Name (Required)' },
  { key: 'quantity', label: 'Quantity (Required)' },
  { key: 'card_number', label: 'Card Number' },
  { key: 'condition', label: 'Condition' },
  { key: 'location', label: 'Location' },
  { key: 'cost', label: 'Cost Basis' },
];

export default function CSVImportWizard() {
  const [step, setStep] = useState<WizardStep>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [taskId, setTaskId] = useState<string | null>(null);
  const [progressStatus, setProgressStatus] = useState<string>('pending');
  const [summary, setSummary] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      
      Papa.parse(selectedFile, {
        header: true,
        preview: 5,
        complete: (results) => {
          if (results.meta.fields) {
            setHeaders(results.meta.fields);
            
            // Auto-map where possible
            const initialMap: Record<string, string> = {};
            results.meta.fields.forEach(header => {
              const lower = header.toLowerCase();
              if (lower.includes('name')) initialMap[header] = 'name';
              else if (lower.includes('set')) initialMap[header] = 'set';
              else if (lower.includes('qty') || lower.includes('quantity')) initialMap[header] = 'quantity';
              else if (lower.includes('cond')) initialMap[header] = 'condition';
              else if (lower.includes('price') || lower.includes('cost')) initialMap[header] = 'cost';
              else if (lower.includes('num')) initialMap[header] = 'card_number';
              else if (lower.includes('loc')) initialMap[header] = 'location';
              else initialMap[header] = '';
            });
            setMapping(initialMap);
          }
          setPreviewData(results.data);
          setStep('preview');
        },
        error: (err) => {
          setError(`Error parsing CSV: ${err.message}`);
        }
      });
    }
  };

  const handleMappingChange = (header: string, field: string) => {
    setMapping(prev => ({
      ...prev,
      [header]: field
    }));
  };

  const handleConfirm = async () => {
    if (!file) return;
    setStep('progress');
    setError(null);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('mapping', JSON.stringify(mapping));

    try {
      const response = await api.post('/inventory/import/csv/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        }
      });
      
      setTaskId(response.data.task_id);
      pollStatus(response.data.task_id);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'An error occurred during upload.');
      setStep('confirm'); // Go back
    }
  };

  const pollStatus = async (id: string) => {
    try {
      const response = await api.get(`/inventory/import/csv/status/${id}/`);
      if (response.data.status === 'completed') {
        setSummary(response.data.summary);
        setStep('complete');
      } else {
        setTimeout(() => pollStatus(id), 2000);
      }
    } catch (err) {
      setError('Error polling status. The task might still be running.');
    }
  };

  return (
    <div className="max-w-4xl bg-zinc-900 border border-zinc-800 shadow-xl rounded-lg p-8">
      {error && (
        <div className="bg-red-900/20 text-red-400 border border-red-900/50 p-4 rounded mb-6">
          {error}
        </div>
      )}

      {/* STEP 1: UPLOAD */}
      {step === 'upload' && (
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-4 text-white">Step 1: Upload CSV</h2>
          <div className="border-2 border-dashed border-zinc-700 rounded-lg p-12 hover:bg-zinc-800/50 transition">
            <input 
              type="file" 
              accept=".csv" 
              className="hidden" 
              id="csv-upload" 
              onChange={handleFileUpload} 
            />
            <label htmlFor="csv-upload" className="cursor-pointer flex flex-col items-center">
              <svg className="w-12 h-12 text-zinc-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <span className="text-blue-400 font-semibold text-lg">Click to select a CSV file</span>
              <span className="text-zinc-500 mt-2">or drag and drop</span>
            </label>
          </div>
        </div>
      )}

      {/* STEP 2: PREVIEW */}
      {step === 'preview' && (
        <div>
          <h2 className="text-xl font-semibold mb-4 text-white">Step 2: Preview Data</h2>
          <p className="text-zinc-400 mb-4">Showing first few rows of your file ({file?.name})</p>
          <div className="overflow-x-auto border border-zinc-800 rounded mb-6">
            <table className="min-w-full divide-y divide-zinc-800">
              <thead className="bg-zinc-950">
                <tr>
                  {headers.map(h => (
                    <th key={h} className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-zinc-900 divide-y divide-zinc-800">
                {previewData.map((row, i) => (
                  <tr key={i}>
                    {headers.map(h => (
                      <td key={h} className="px-6 py-4 whitespace-nowrap text-sm text-zinc-400">{row[h]}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex justify-between">
            <button onClick={() => setStep('upload')} className="px-4 py-2 border border-zinc-700 rounded text-zinc-400 hover:bg-zinc-800">Back</button>
            <button onClick={() => setStep('map')} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Next: Map Columns</button>
          </div>
        </div>
      )}

      {/* STEP 3: MAP */}
      {step === 'map' && (
        <div>
          <h2 className="text-xl font-semibold mb-4 text-white">Step 3: Map Columns</h2>
          <p className="text-zinc-400 mb-4">Match your CSV columns to TradingCardPro fields.</p>
          
          <div className="space-y-4 mb-6">
            {headers.map(header => (
              <div key={header} className="flex items-center space-x-4 border-b border-zinc-800 pb-4">
                <div className="w-1/3 font-medium text-zinc-300">{header}</div>
                <div className="text-zinc-600">→</div>
                <div className="w-1/3">
                  <select 
                    value={mapping[header] || ''} 
                    onChange={(e) => handleMappingChange(header, e.target.value)}
                    className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-zinc-700 bg-zinc-950 text-zinc-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md border"
                  >
                    <option value="">-- Ignore --</option>
                    {INTERNAL_FIELDS.map(f => (
                      <option key={f.key} value={f.key} disabled={Object.values(mapping).includes(f.key) && mapping[header] !== f.key}>
                        {f.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-between">
            <button onClick={() => setStep('preview')} className="px-4 py-2 border border-zinc-700 rounded text-zinc-400 hover:bg-zinc-800">Back</button>
            <button onClick={() => setStep('confirm')} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Next: Confirm</button>
          </div>
        </div>
      )}

      {/* STEP 4: CONFIRM */}
      {step === 'confirm' && (
        <div>
          <h2 className="text-xl font-semibold mb-4 text-white">Step 4: Confirm Import</h2>
          <div className="bg-zinc-950 p-6 rounded-lg mb-6 border border-zinc-800">
            <p className="mb-2 text-zinc-300"><strong>File:</strong> {file?.name}</p>
            <p className="mb-4 text-zinc-300"><strong>Mapped Fields:</strong></p>
            <ul className="list-disc pl-5 space-y-1 text-sm text-zinc-400">
              {Object.entries(mapping).filter(([_, v]) => v).map(([k, v]) => (
                <li key={k}>{k} → {INTERNAL_FIELDS.find(f => f.key === v)?.label}</li>
              ))}
            </ul>
          </div>
          <div className="flex justify-between">
            <button onClick={() => setStep('map')} className="px-4 py-2 border border-zinc-700 rounded text-zinc-400 hover:bg-zinc-800">Back</button>
            <button onClick={handleConfirm} className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 font-semibold">Start Import</button>
          </div>
        </div>
      )}

      {/* STEP 5: PROGRESS */}
      {step === 'progress' && (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
          <h2 className="text-xl font-semibold text-white">Importing your inventory...</h2>
          <p className="text-zinc-500 mt-2">This might take a minute depending on the file size. Please don't close this tab.</p>
        </div>
      )}

      {/* STEP 6: COMPLETE */}
      {step === 'complete' && summary && (
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-900/20 text-green-500 mb-6">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
          </div>
          <h2 className="text-2xl font-bold mb-2 text-white">Import Complete!</h2>
          
          <div className="grid grid-cols-2 gap-4 max-w-sm mx-auto mt-6 mb-8">
            <div className="bg-zinc-950 p-4 rounded text-center border border-zinc-800">
              <div className="text-3xl font-bold text-green-500">{summary.created}</div>
              <div className="text-sm text-zinc-500">Lots Created</div>
            </div>
            <div className="bg-zinc-950 p-4 rounded text-center border border-zinc-800">
              <div className="text-3xl font-bold text-zinc-400">{summary.skipped}</div>
              <div className="text-sm text-zinc-500">Rows Skipped</div>
            </div>
          </div>

          {summary.errors && summary.errors.length > 0 && (
            <div className="text-left bg-red-900/20 p-4 rounded max-h-60 overflow-y-auto mt-6 border border-red-900/50">
              <h3 className="font-semibold text-red-400 mb-2">Errors & Warnings:</h3>
              <ul className="list-disc pl-5 text-sm text-red-400/80 space-y-1">
                {summary.errors.map((err: string, i: number) => <li key={i}>{err}</li>)}
              </ul>
            </div>
          )}

          <div className="mt-8">
            <button onClick={() => {
              setStep('upload');
              setFile(null);
              setSummary(null);
            }} className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Import Another File</button>
          </div>
        </div>
      )}
    </div>
  );
}
