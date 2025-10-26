
import React, { useState, useCallback } from 'react';
import { Ticket, Technician } from './types';
import AgentPanel from './components/AgentPanel';
import DashboardPanel from './components/DashboardPanel';

const initialTechnicians: Technician[] = [
    { id: 'tech-01', name: 'Anil Kumar', skills: ['Fiber', 'IPTV'] },
    { id: 'tech-02', name: 'Sunita Sharma', skills: ['Broadband', 'Billing'] },
    { id: 'tech-03', name: 'Rajesh Singh', skills: ['OTT', 'IPTV'] },
    { id: 'tech-04', name: 'Priya Mehta', skills: ['Fiber', 'Network'] },
];

const Dashboard: React.FC = () => {
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [technicians] = useState<Technician[]>(initialTechnicians);
    const [autoResolvedCount, setAutoResolvedCount] = useState(0);

    const handleTicketCreated = useCallback((newTicketInfo: Omit<Ticket, 'id' | 'status' | 'assignedTo'>) => {
        setTickets(prevTickets => {
            const availableTechnicians = technicians.filter(t => 
                t.skills.includes(newTicketInfo.category) || t.skills.includes(newTicketInfo.category.split(' ')[0])
            );
            const assignedTechnician = availableTechnicians.length > 0
                ? availableTechnicians[Math.floor(Math.random() * availableTechnicians.length)]
                : technicians[Math.floor(Math.random() * technicians.length)];

            const newTicket: Ticket = {
                ...newTicketInfo,
                id: `TCK-${Math.floor(10000 + Math.random() * 90000)}`,
                status: 'Assigned',
                assignedTo: assignedTechnician.id,
            };

            // Simulate notifications
            console.log(`--- NOTIFICATION ---`);
            console.log(`Ticket ${newTicket.id} ASSIGNED to ${assignedTechnician.name}.`);
            console.log(`  -> SMS to Customer (${newTicket.customerName}): "Your ticket ${newTicket.id} has been assigned to technician ${assignedTechnician.name}. Expect a call shortly."`);
            console.log(`  -> SMS to Technician (${assignedTechnician.name}): "New ticket ${newTicket.id} for ${newTicket.customerName} (${newTicket.category}) has been assigned to you."`);
            console.log(`--------------------`);


            return [...prevTickets, newTicket];
        });
    }, [technicians]);

    const handleTicketAutoResolved = useCallback(() => {
        setAutoResolvedCount(prev => prev + 1);
        console.log(`--- NOTIFICATION ---`);
        console.log(`An issue was resolved automatically by the AI agent.`);
        console.log(`--------------------`);
    }, []);

    return (
        <div className="flex flex-col h-screen bg-gradient-to-br from-sky-100 to-indigo-200 dark:from-slate-900 dark:to-slate-800 font-sans text-slate-800 dark:text-slate-200">
            <header className="flex-shrink-0 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border-b border-slate-200 dark:border-slate-700 shadow-sm p-4">
                <h1 className="text-xl font-bold text-center">Stratowave Solutions - Agent Dashboard</h1>
            </header>
            <main className="flex-1 flex flex-col lg:flex-row gap-6 p-6 overflow-hidden">
                <div className="lg:w-1/2 xl:w-1/3 flex flex-col h-full">
                    <AgentPanel onTicketCreated={handleTicketCreated} onTicketAutoResolved={handleTicketAutoResolved} />
                </div>
                <div className="lg:w-1/2 xl:w-2/3 flex flex-col h-full">
                    <DashboardPanel tickets={tickets} technicians={technicians} autoResolvedCount={autoResolvedCount} />
                </div>
            </main>
        </div>
    );
};

export default Dashboard;