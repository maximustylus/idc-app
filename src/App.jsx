import React, { useState, useEffect } from 'react';
import { db, auth } from './firebase';
import { collection, onSnapshot, doc } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { 
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend 
} from 'recharts';
import { Sun, Moon, LogOut, LayoutDashboard, Archive, Calendar, Upload, Download, FileCode, Sparkles } from 'lucide-react';

// Components
import AdminPanel from './components/AdminPanel';
import Login from './components/Login';
import ResponsiveLayout from './components/ResponsiveLayout';
import SmartAnalysis from './components/SmartAnalysis';

// Utils
import { STAFF_LIST, MONTHS, DOMAIN_LIST, STATUS_OPTIONS } from './utils';

// --- COLORS ---
const COLORS = ['#FFC107', '#FF9800', '#FF5722', '#4CAF50', '#2196F3']; 
const STATUS_COLORS = { 1: '#EF4444', 2: '#A855F7', 3: '#F59E0B', 4: '#3B82F6', 5: '#10B981' };

// Placeholder Data for Attendance
const ATTENDANCE_DATA = [
  { name: 'Jan', value: 300 }, { name: 'Feb', value: 10 }, { name: 'Mar', value: 5 }, 
  { name: 'Apr', value: 8 }, { name: 'May', value: 12 }, { name: 'Jun', value: 15 }, 
  { name: 'Jul', value: 20 }, { name: 'Aug', value: 18 }, { name: 'Sep', value: 25 }, 
  { name: 'Oct', value: 30 }, { name: 'Nov', value: 35 }, { name: 'Dec', value: 40 }
];

function App() {
  // --- STATE MANAGEMENT ---
  const [currentView, setCurrentView] = useState('dashboard'); // 'dashboard', 'archive', 'roster'
  const [archiveYear, setArchiveYear] = useState('2025');
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isAnalysisOpen, setIsAnalysisOpen] = useState(false); // <--- NEW STATE FOR AI
  const [isDark, setIsDark] = useState(false);
  const [user, setUser] = useState(null);
  
  // Data States
  const [teamData, setTeamData] = useState([]); 
  const [staffLoads, setStaffLoads] = useState({});

  // 0. Auth Listener
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((u) => setUser(u));
    return () => unsubscribe();
  }, []);

  // 1. Fetch Data
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'cep_team'), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const sortedData = STAFF_LIST.map(name => {
        return data.find(d => d.staff_name === name) || { staff_name: name, projects: [] };
      });
      setTeamData(sortedData);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const unsubscribes = STAFF_LIST.map(staff => {
      return onSnapshot(doc(db, 'staff_loads', staff), (docSnap) => {
        if (docSnap.exists()) {
          setStaffLoads(prev => ({ ...prev, [staff]: docSnap.data().data }));
        } else {
          setStaffLoads(prev => ({ ...prev, [staff]: Array(12).fill(0) }));
        }
      });
    });
    return () => unsubscribes.forEach(u => u());
  }, []);

  // --- CHART HELPERS ---
  const getPieData = () => {
    const counts = { MANAGEMENT: 0, CLINICAL: 0, EDUCATION: 0, RESEARCH: 0 };
    teamData.forEach(staff => {
      (staff.projects || []).forEach(p => {
        if (counts[p.domain_type] !== undefined) counts[p.domain_type]++;
      });
    });
    return Object.keys(counts).map((key, index) => ({ name: key, value: counts[key], fill: COLORS[index] })).filter(d => d.value > 0);
  };

  const getStatusData = () => {
    const tasks = { name: 'Tasks', 1:0, 2:0, 3:0, 4:0, 5:0 };
    const projects = { name: 'Projects', 1:0, 2:0, 3:0, 4:0, 5:0 };
    teamData.forEach(staff => {
      (staff.projects || []).forEach(p => {
        const status = p.status_dots || 2;
        if (p.item_type === 'Project') projects[status]++; else tasks[status]++;
      });
    });
    return [tasks, projects];
  };

  const
