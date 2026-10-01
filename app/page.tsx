import React from 'react';

export default function Home() {
  // We will replace this dummy data with real Notion data soon!
  const dummyPlacements = [
    { id: 1, name: "Project Alpha", status: "Active", client: "Acme Corp", date: "2026-10-01" },
    { id: 2, name: "Project Beta", status: "Completed", client: "Globex", date: "2026-09-15" },
    { id: 3, name: "Project Gamma", status: "Pending", client: "Initech", date: "2026-10-10" },
  ];

  return (
    <div className="min-h-screen p-8 sm:p-20 font-[family-name:var(--font-geist-sans)]">
      <main className="max-w-4xl mx-auto flex flex-col gap-8">
        
        <header className="flex justify-between items-center border-b pb-4">
          <h1 className="text-3xl font-bold">PlaceHub Dashboard</h1>
          <button className="bg-foreground text-background px-4 py-2 rounded-md text-sm hover:opacity-90">
            + Quick Add to Notion
          </button>
        </header>

        <section>
          <h2 className="text-xl font-semibold mb-4">Recent Placements (Dummy Data)</h2>
          
          <div className="overflow-x-auto border rounded-lg">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="px-6 py-4 font-medium">Project Name</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                  <th className="px-6 py-4 font-medium">Client</th>
                  <th className="px-6 py-4 font-medium">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {dummyPlacements.map((project) => (
                  <tr key={project.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/50">
                    <td className="px-6 py-4 font-medium">{project.name}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        project.status === 'Active' ? 'bg-green-100 text-green-700' :
                        project.status === 'Completed' ? 'bg-blue-100 text-blue-700' :
                        'bg-yellow-100 text-yellow-700'
                      }`}>
                        {project.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">{project.client}</td>
                    <td className="px-6 py-4">{project.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

      </main>
    </div>
  );
}
