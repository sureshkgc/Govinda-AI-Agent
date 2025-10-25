
import React from 'react';
import { Ticket, Technician } from '../types';
import { TicketIcon, UserIcon } from './icons';

interface DashboardPanelProps {
    tickets: Ticket[];
    technicians: Technician[];
}

const DashboardPanel: React.FC<DashboardPanelProps> = ({ tickets, technicians }) => {
    const getTechnicianName = (id?: string) => {
        if (!id) return 'Unassigned';
        return technicians.find(t => t.id === id)?.name || 'Unknown';
    };

    const getStatusColor = (status: Ticket['status']) => {
        switch (status) {
            case 'New': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
            case 'Assigned': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
            case 'In Progress': return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300';
            case 'Resolved': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
            default: return 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300';
        }
    };
    
    return (
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg flex flex-col h-full">
            <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex items-center gap-3">
                 <TicketIcon className="w-6 h-6 text-blue-500" />
                <h2 className="text-lg font-semibold">Support Ticket Dashboard</h2>
            </div>
            <div className="flex-1 overflow-y-auto">
                {tickets.length === 0 ? (
                    <div className="text-center p-10 text-slate-500">
                        <p>No tickets yet.</p>
                        <p className="text-sm">New tickets will appear here automatically.</p>
                    </div>
                ) : (
                    <div className="relative overflow-x-auto">
                        <table className="w-full text-sm text-left text-slate-500 dark:text-slate-400">
                            <thead className="text-xs text-slate-700 uppercase bg-slate-50 dark:bg-slate-700 dark:text-slate-400">
                                <tr>
                                    <th scope="col" className="px-6 py-3">Ticket ID</th>
                                    <th scope="col" className="px-6 py-3">Customer</th>
                                    <th scope="col" className="px-6 py-3">Issue</th>
                                    <th scope="col" className="px-6 py-3">Status</th>
                                    <th scope="col" className="px-6 py-3">Assigned To</th>
                                </tr>
                            </thead>
                            <tbody>
                                {tickets.map(ticket => (
                                    <tr key={ticket.id} className="bg-white border-b dark:bg-slate-800 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600">
                                        <th scope="row" className="px-6 py-4 font-medium text-slate-900 whitespace-nowrap dark:text-white">
                                            {ticket.id}
                                        </th>
                                        <td className="px-6 py-4">{ticket.customerName}</td>
                                        <td className="px-6 py-4">{ticket.category}</td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(ticket.status)}`}>
                                                {ticket.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">{getTechnicianName(ticket.assignedTo)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
             <div className="p-4 border-t border-slate-200 dark:border-slate-700">
                <h3 className="text-md font-semibold mb-2 flex items-center gap-2">
                    <UserIcon className="w-5 h-5" /> Available Technicians
                </h3>
                <div className="flex flex-wrap gap-2">
                    {technicians.map(tech => (
                        <span key={tech.id} className="px-3 py-1 text-xs font-medium rounded-full bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200">
                           {tech.name}
                        </span>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default DashboardPanel;
