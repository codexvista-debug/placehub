import React from 'react';

export default function Home() {
  // We will replace this dummy data with real Notion data soon!
  const dummyPlacements = [
    { id: 1, name: "Project Alpha", status: "Active", client: "Acme Corp", date: "2026-10-01" },
    { id: 2, name: "Project Beta", status: "Completed", client: "Globex", date: "2026-09-15" },
    { id: 3, name: "Project Gamma", status: "Pending", client: "Initech", date: "2026-10-10" },
  ];

  return (
    <div className="min-h-screen bg-lime-50 text-slate-900 p-8 sm:p-20 font-[family-name:var(--font-geist-sans)]">
      <main className="max-w-4xl mx-auto flex flex-col gap-8 bg-white p-8 rounded-xl shadow-sm border border-lime-200">
        
        <header className="flex justify-between items-center border-b border-lime-100 pb-4">
          <h1 className="text-3xl font-bold text-lime-900">PlaceRover Dashboard</h1>
          <button className="bg-lime-600 text-white px-4 py-2 rounded-md text-sm font-semibold hover:bg-lime-700 transition-colors shadow-sm">
            + Quick Add to Notion
          </button>
        </header>

        <section>
          <h2 className="text-xl font-semibold mb-4 text-lime-800">Recent Placements</h2>
          
          <div className="overflow-hidden border border-lime-200 rounded-lg shadow-sm">
            <table className="min-w-full text-left text-sm bg-white">
              <thead className="border-b border-lime-200 bg-lime-100 text-lime-900">
                <tr>
                  <th className="px-6 py-4 font-semibold">Project Name</th>
                  <th className="px-6 py-4 font-semibold">Status</th>
                  <th className="px-6 py-4 font-semibold">Client</th>
                  <th className="px-6 py-4 font-semibold">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-lime-100">
                {dummyPlacements.map((project) => (
                  <tr key={project.id} className="hover:bg-lime-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-slate-800">{project.name}</td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        project.status === 'Active' ? 'bg-green-100 text-green-700 border border-green-200' :
                        project.status === 'Completed' ? 'bg-blue-100 text-blue-700 border border-blue-200' :
                        'bg-amber-100 text-amber-700 border border-amber-200'
                      }`}>
                        {project.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-600">{project.client}</td>
                    <td className="px-6 py-4 text-slate-600">{project.date}</td>
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
