
import React, { useState, useCallback } from 'react';
import { Ticket, Technician, CallStats, Call, Transcript } from './types';
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
    const [newConnectionRequests, setNewConnectionRequests] = useState(0);
    const [calls, setCalls] = useState<Call[]>([]);
    const [activeCallId, setActiveCallId] = useState<string | null>(null);
    const [callStats, setCallStats] = useState<CallStats>({
        totalCalls: 0,
        attendedCalls: 0,
        missedCalls: 0,
        forwardedCalls: 0,
    });

    const handleTicketCreated = useCallback((newTicket: Ticket) => {
        setTickets(prevTickets => {
            const assignedTechnician = technicians.find(t => t.id === newTicket.assignedTo);

            if (assignedTechnician) {
                 // Simulate notifications
                console.log(`--- NOTIFICATION ---`);
                console.log(`Ticket ${newTicket.id} ASSIGNED to ${assignedTechnician.name}.`);
                console.log(`  -> SMS to Customer (${newTicket.customerName}): "Your ticket ${newTicket.id} has been assigned to technician ${assignedTechnician.name}. Expect a call shortly."`);
                console.log(`  -> SMS to Technician (${assignedTechnician.name}): "New ticket ${newTicket.id} for ${newTicket.customerName} (${newTicket.category}) has been assigned to you."`);
                console.log(`--------------------`);
            }


            return [...prevTickets, newTicket];
        });
    }, [technicians]);

    const handleTicketAutoResolved = useCallback(() => {
        setAutoResolvedCount(prev => prev + 1);
        console.log(`--- NOTIFICATION ---`);
        console.log(`An issue was resolved automatically by the AI agent.`);
        console.log(`--------------------`);
    }, []);

    const handleNewConnectionRequest = useCallback(() => {
        setNewConnectionRequests(prev => prev + 1);
        console.log(`--- NOTIFICATION ---`);
        console.log(`A new connection request was registered by the AI agent.`);
        console.log(`--------------------`);
    }, []);

    const handleCallStarted = useCallback(() => {
        const newCallId = `call-${Date.now()}`;
        const newCall: Call = { 
            id: newCallId, 
            startTime: new Date(), 
            status: 'In Progress', 
            transcript: [] 
        };
        setCalls(prev => [...prev, newCall]);
        setActiveCallId(newCallId);

        setCallStats(prev => ({
            ...prev,
            totalCalls: prev.totalCalls + 1,
            attendedCalls: prev.attendedCalls + 1,
        }));
    }, []);

    const handleCallForwarded = useCallback(() => {
        setCalls(prevCalls => prevCalls.map(c => 
            c.id === activeCallId ? { ...c, status: 'Forwarded' } : c
        ));
        setCallStats(prev => ({
            ...prev,
            forwardedCalls: prev.forwardedCalls + 1,
        }));
    }, [activeCallId]);
    
    const handleCallEnded = useCallback((finalTranscript: Transcript[]) => {
        setCalls(prevCalls => prevCalls.map(c => 
            c.id === activeCallId ? { ...c, status: c.status === 'Forwarded' ? 'Forwarded' : 'Completed', endTime: new Date(), transcript: finalTranscript } : c
        ));
        setActiveCallId(null);
    }, [activeCallId]);

    return (
        <div className="flex flex-col h-screen bg-gradient-to-br from-sky-100 to-indigo-200 dark:from-slate-900 dark:to-slate-800 font-sans text-slate-800 dark:text-slate-200">
            <header className="flex-shrink-0 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border-b border-slate-200 dark:border-slate-700 shadow-sm p-4">
                <h1 className="text-xl font-bold text-center">Stratowave Solutions - Agent Dashboard</h1>
            </header>
            <main className="flex-1 flex flex-col lg:flex-row gap-6 p-6 overflow-hidden">
                <div className="lg:w-1/2 xl:w-1/3 flex flex-col h-full">
                    <AgentPanel 
                        onTicketCreated={handleTicketCreated} 
                        onTicketAutoResolved={handleTicketAutoResolved}
                        onNewConnectionRequest={handleNewConnectionRequest}
                        onCallStarted={handleCallStarted}
                        onCallForwarded={handleCallForwarded}
                        onCallEnded={handleCallEnded}
                        technicians={technicians}
                    />
                </div>
                <div className="lg:w-1/2 xl:w-2/3 flex flex-col h-full">
                    <DashboardPanel 
                        tickets={tickets} 
                        technicians={technicians} 
                        autoResolvedCount={autoResolvedCount} 
                        newConnectionRequests={newConnectionRequests}
                        callStats={callStats} 
                        calls={calls}
                    />
                </div>
            </main>
        </div>
    );
};

export default Dashboard;
