import CSVImportWizard from '@/components/CSVImportWizard';

export default function CSVImportPage() {
  return (
    <div className="container mx-auto py-10 px-4">
      <h1 className="text-3xl font-bold mb-6">Import Inventory from CSV</h1>
      <CSVImportWizard />
    </div>
  );
}
