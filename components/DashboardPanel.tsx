import React, { useMemo } from 'react';
import { Ticket, Technician, CallStats } from '../types';
import { 
    TicketIcon, 
    UserIcon, 
    CheckCircleIcon, 
    ClockIcon, 
    ClipboardDocumentListIcon, 
    SparklesIcon,
    PhoneIcon,
    PhoneArrowDownLeftIcon,
    PhoneXMarkIcon
} from './icons';

interface DashboardPanelProps {
    tickets: Ticket[];
    technicians: Technician[];
    autoResolvedCount: number;
    callStats: CallStats;
}

// --- PIE CHART COMPONENT ---
interface PieChartProps {
    data: { [key: string]: number };
    title: string;
}

const PieChart: React.FC<PieChartProps> = ({ data, title }) => {
    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#6366f1', '#f43f5e', '#22d3ee'];
    
    const total = useMemo(() => Object.values(data).reduce((acc: number, value: number) => acc + value, 0), [data]);

    if (total === 0) {
        return (
             <div className="bg-white/80 dark:bg-slate-800/80 p-3 rounded-lg shadow-md flex flex-col">
                <h3 className="text-md font-semibold text-slate-700 dark:text-slate-300 mb-2">{title}</h3>
                <div className="flex-grow flex items-center justify-center text-sm text-slate-500 py-8">
                    No data to display.
                </div>
            </div>
        )
    }

    let cumulativePercent = 0;
    const slices = Object.entries(data).map(([key, value]) => {
        const percent = value / total;
        // Fix: The left-hand side of an arithmetic operation must be of type 'any', 'number', 'bigint' or an enum type. Restoring explicit `Number()` conversion.
        const startAngle = Number(cumulativePercent) * 360;
        const endAngle = (cumulativePercent + percent) * 360;
        cumulativePercent += percent;
        return { key, value, percent, startAngle, endAngle };
    });

    const getCoordinatesForPercent = (percent: number) => {
        const x = Math.cos(2 * Math.PI * percent);
        const y = Math.sin(2 * Math.PI * percent);
        return [x, y];
    };

    return (
        <div className="bg-white/80 dark:bg-slate-800/80 p-2 rounded-lg shadow-md flex flex-col">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">{title}</h3>
            <div className="flex items-center justify-center gap-2">
                <div className="relative w-20 h-20">
                    <svg viewBox="-1 -1 2 2" className="transform -rotate-90">
                        {slices.map((slice, index) => {
                            let [startX, startY] = getCoordinatesForPercent(slice.startAngle / 360);
                            let [endX, endY] = getCoordinatesForPercent(slice.endAngle / 360);
                            const largeArcFlag = slice.percent > 0.5 ? 1 : 0;
                            const pathData = [
                                `M ${startX} ${startY}`,
                                `A 1 1 0 ${largeArcFlag} 1 ${endX} ${endY}`,
                                `L 0 0`,
                            ].join(' ');
                            return <path key={slice.key} d={pathData} fill={colors[index % colors.length]} />;
                        })}
                    </svg>
                </div>
                <div className="text-[11px] text-slate-600 dark:text-slate-400">
                    <ul className="space-y-0">
                        {slices.map((slice, index) => (
                            <li key={slice.key} className="flex items-center gap-1">
                                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: colors[index % colors.length] }}></span>
                                <span>{slice.key}: <strong>{slice.value}</strong></span>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </div>
    );
};


// --- KPI CARD COMPONENT ---
interface KpiCardProps {
    title: string;
    value: number;
    icon: React.ReactNode;
    color: 'blue' | 'green' | 'yellow' | 'purple' | 'red' | 'indigo';
}
const KpiCard: React.FC<KpiCardProps> = ({ title, value, icon, color }) => {
    const colorClasses = {
        blue: 'bg-blue-100 dark:bg-blue-900/50 text-blue-500',
        green: 'bg-green-100 dark:bg-green-900/50 text-green-500',
        yellow: 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-500',
        purple: 'bg-purple-100 dark:bg-purple-900/50 text-purple-500',
        red: 'bg-red-100 dark:bg-red-900/50 text-red-500',
        indigo: 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-500',
    }
    return (
        <div className="bg-white/80 dark:bg-slate-800/80 p-4 rounded-lg shadow-md flex items-center gap-4">
            <div className={`p-3 rounded-full ${colorClasses[color]}`}>
                {icon}
            </div>
            <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">{title}</p>
                <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{value}</p>
            </div>
        </div>
    )
};


const DashboardPanel: React.FC<DashboardPanelProps> = ({ tickets, technicians, autoResolvedCount, callStats }) => {
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
    
    const analytics = useMemo(() => {
        const ticketsByCategory = tickets.reduce((acc, ticket) => {
            acc[ticket.category] = (acc[ticket.category] || 0) + 1;
            return acc;
        }, {} as { [key: string]: number });

        const ticketsByStatus = tickets.reduce((acc, ticket) => {
            acc[ticket.status] = (acc[ticket.status] || 0) + 1;
            return acc;
        }, {} as { [key: string]: number });

        const ticketsByTechnician = tickets.reduce((acc, ticket) => {
            const techName = getTechnicianName(ticket.assignedTo);
            acc[techName] = (acc[techName] || 0) + 1;
            return acc;
        }, {} as { [key: string]: number });

        return {
            total: tickets.length,
            open: tickets.filter(t => t.status !== 'Resolved').length,
            resolved: tickets.filter(t => t.status === 'Resolved').length,
            byCategory: ticketsByCategory,
            byStatus: ticketsByStatus,
            byTechnician: ticketsByTechnician,
        };
    }, [tickets, technicians]);

    const ticketsByTechId = useMemo(() => {
        return tickets.reduce((acc, ticket) => {
            if (ticket.assignedTo) {
                acc[ticket.assignedTo] = (acc[ticket.assignedTo] || 0) + 1;
            }
            return acc;
        }, {} as {[key: string]: number});
    }, [tickets]);


    return (
        <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm rounded-lg shadow-lg flex flex-col h-full">
            <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex items-center gap-3">
                 <TicketIcon className="w-6 h-6 text-blue-500" />
                <h2 className="text-lg font-semibold">Support Ticket Dashboard</h2>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
                {/* --- KPI CARDS --- */}
                <div>
                     <h3 className="text-lg font-semibold mb-3 text-slate-800 dark:text-slate-200">Key Metrics</h3>
                     <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                         <KpiCard title="Total Tickets" value={analytics.total} icon={<ClipboardDocumentListIcon className="w-6 h-6" />} color="blue"/>
                         <KpiCard title="Open Tickets" value={analytics.open} icon={<ClockIcon className="w-6 h-6" />} color="yellow" />
                         <KpiCard title="Resolved Tickets" value={analytics.resolved} icon={<CheckCircleIcon className="w-6 h-6" />} color="green" />
                         <KpiCard title="Auto Resolved" value={autoResolvedCount} icon={<SparklesIcon className="w-6 h-6" />} color="purple"/>
                     </div>
                </div>

                {/* --- CHARTS --- */}
                <div>
                     <h3 className="text-lg font-semibold mb-3 text-slate-800 dark:text-slate-200">Analytics Breakdown</h3>
                     <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                        <PieChart title="Tickets by Category" data={analytics.byCategory} />
                        <PieChart title="Tickets by Status" data={analytics.byStatus} />
                        <PieChart title="Tickets by Technician" data={analytics.byTechnician} />
                     </div>
                </div>

                {/* --- CALL CENTER ANALYTICS SECTION --- */}
                <div>
                    <h3 className="text-lg font-semibold mb-3 text-slate-800 dark:text-slate-200">Call Center Analytics</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <KpiCard title="Total Calls Received" value={callStats.totalCalls} icon={<PhoneIcon className="w-6 h-6" />} color="blue"/>
                        <KpiCard title="Calls Attended" value={callStats.attendedCalls} icon={<PhoneArrowDownLeftIcon className="w-6 h-6" />} color="green" />
                        <KpiCard title="Calls Missed" value={callStats.missedCalls} icon={<PhoneXMarkIcon className="w-6 h-6" />} color="red" />
                        <KpiCard title="Calls Forwarded" value={callStats.forwardedCalls} icon={<UserIcon className="w-6 h-6" />} color="indigo"/>
                    </div>
                </div>

                {/* --- TICKETS TABLE SECTION --- */}
                <div>
                    <h3 className="text-lg font-semibold mb-3 text-slate-800 dark:text-slate-200">Live Tickets</h3>
                    {tickets.length === 0 ? (
                        <div className="text-center p-10 text-slate-500 bg-slate-50/50 dark:bg-slate-900/50 rounded-lg">
                            <p>No tickets yet.</p>
                            <p className="text-sm">New tickets will appear here automatically.</p>
                        </div>
                    ) : (
                        <div className="relative overflow-x-auto shadow-md sm:rounded-lg">
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
            </div>
             <div className="p-4 border-t border-slate-200 dark:border-slate-700">
                <h3 className="text-md font-semibold mb-2 flex items-center gap-2">
                    <UserIcon className="w-5 h-5" /> Technician Workload
                </h3>
                <div className="flex flex-wrap gap-2">
                    {technicians.map(tech => (
                        <span key={tech.id} className="px-3 py-1 text-xs font-medium rounded-full bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200">
                           {tech.name} ({ticketsByTechId[tech.id] || 0})
                        </span>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default DashboardPanel;