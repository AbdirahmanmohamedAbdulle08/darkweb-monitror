import React from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '../../layouts/DashboardLayout.tsx';
import { ScannerComponent } from '../../components/ScannerComponent.tsx';
import type { Scan } from '../../types/index.ts';

export function NewScanPage() {
  const navigate = useNavigate();

  const handleScanDone = (scan: Scan) => {
    navigate(`/scan/${scan.id}`);
  };

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[#F8FAFC]">New Threat Intelligence Scan</h1>
          <p className="text-xs text-[#94A3B8]">
            Perform an authorized exposure query against Have I Been Pwned v3 intelligence feeds.
          </p>
        </div>

        <ScannerComponent isAuthenticated={true} onScanComplete={handleScanDone} />
      </div>
    </DashboardLayout>
  );
}
