import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient'; 

import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './components/ui/card';
import { Button } from './components/ui/button';
import { Input } from './components/ui/input';
import { Label } from './components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from './components/ui/dialog';
import { Badge } from './components/ui/badge';
// Tambahan ikon 'Edit' di bawah ini
import { Trash2, Edit, Plus, Trophy, Calculator, Users, Settings, BarChart3, Award, TrendingUp, Target, Sparkles, CheckCircle2, Star } from 'lucide-react';
import { toast, Toaster } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Cell } from 'recharts';

type Employee = {
  id: string;
  name: string;
  kejujuran: number;
  kesetiaan: number;
  sikap: number;
  produktivitas: number;
  disiplin: number;
  kerjasama: number;
};

type CalculationResult = {
  employee: Employee;
  gaps: number[];
  weights: number[];
  ncf: number;
  nsf: number;
  total: number;
  rank: number;
};

const GAP_WEIGHTS: Record<number, number> = {
  0: 5,
  1: 4.5,
  '-1': 4,
  2: 3.5,
  '-2': 3,
  3: 2.5,
  '-3': 2,
  4: 1.5,
  '-4': 1,
};

const CRITERIA_LABELS = {
  kejujuran: 'Kejujuran',
  kesetiaan: 'Kesetiaan',
  sikap: 'Sikap (Attitude)',
  produktivitas: 'Produktivitas',
  disiplin: 'Disiplin',
  kerjasama: 'Kemampuan Bekerja Sama',
};

const CRITERIA_OPTIONS = {
  kejujuran: [
    { value: 5, label: 'Sangat jujur' },
    { value: 4, label: 'Jujur' },
    { value: 3, label: 'Sedang' },
    { value: 2, label: 'Kurang jujur' },
    { value: 1, label: 'Tidak jujur' },
  ],
  kesetiaan: [
    { value: 5, label: 'Bekerja > 5 tahun' },
    { value: 4, label: 'Bekerja 3-5 tahun' },
    { value: 3, label: 'Bekerja 2-3 tahun' },
    { value: 2, label: 'Bekerja 1-2 tahun' },
    { value: 1, label: 'Karyawan baru' },
  ],
  sikap: [
    { value: 5, label: 'Sangat baik' },
    { value: 4, label: 'Baik' },
    { value: 3, label: 'Lumayan' },
    { value: 2, label: 'Kurang baik' },
    { value: 1, label: 'Tidak baik' },
  ],
  produktivitas: [
    { value: 5, label: 'Produktivitas tinggi dan semangat tinggi' },
    { value: 4, label: 'Produktivitas baik' },
    { value: 3, label: 'Produktivitas rata-rata' },
    { value: 2, label: 'Produktivitas rendah' },
    { value: 1, label: 'Produktivitas sangat rendah' },
  ],
  disiplin: [
    { value: 5, label: 'Tidak pernah / sangat jarang terlambat' },
    { value: 4, label: 'Dalam 1 bulan 2-3 kali terlambat' },
    { value: 3, label: 'Dalam 1 bulan 4-5 kali terlambat' },
    { value: 2, label: 'Dalam 1 bulan 6-8 kali terlambat' },
    { value: 1, label: 'Sering terlambat' },
  ],
  kerjasama: [
    { value: 5, label: 'Mampu bekerja sama dengan sangat baik' },
    { value: 4, label: 'Lumayan mampu bekerja sama' },
    { value: 3, label: 'Sedang' },
    { value: 2, label: 'Kurang mampu bekerja sama' },
    { value: 1, label: 'Tidak mampu bekerja sama' },
  ],
};

const COLORS = ['#3B82F6', '#8B5CF6', '#EC4899', '#F59E0B', '#10B981', '#6366F1'];

export default function App() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [openDialog, setOpenDialog] = useState(false);
  // State baru untuk Dialog Edit
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);

  const [gapValues, setGapValues] = useState({
    kejujuran: 5,
    kesetiaan: 5,
    sikap: 5,
    produktivitas: 5,
    disiplin: 5,
    kerjasama: 5,
  });
  const [coreFactorPercent, setCoreFactorPercent] = useState(60);
  const [secondaryFactorPercent, setSecondaryFactorPercent] = useState(40);
  
  const [newEmployee, setNewEmployee] = useState({
    name: '',
    kejujuran: 3,
    kesetiaan: 3,
    sikap: 3,
    produktivitas: 3,
    disiplin: 3,
    kerjasama: 3,
  });

  // 1. READ
  const fetchEmployees = async () => {
    const { data, error } = await supabase
      .from('karyawan')
      .select('*, penilaian(*)');

    if (error) {
      console.error('Error fetching data:', error.message);
      toast.error('Gagal mengambil data dari database');
    } else if (data) {
      const formattedData: Employee[] = data.map((item: any) => {
        const dapatkanNilai = (idKriteria: number) => {
          const cocok = item.penilaian?.find((p: any) => p.kriteria_id === idKriteria);
          return cocok ? cocok.nilai : 3; 
        };

        return {
          id: item.id.toString(),
          name: item.nama,
          kejujuran: dapatkanNilai(1),
          kesetiaan: dapatkanNilai(2),
          sikap: dapatkanNilai(3),
          produktivitas: dapatkanNilai(4),
          disiplin: dapatkanNilai(5),
          kerjasama: dapatkanNilai(6),
        };
      });
      setEmployees(formattedData);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  // 2. CREATE
  const addEmployee = async () => {
    if (!newEmployee.name.trim()) {
      toast.error('Nama karyawan harus diisi');
      return;
    }

    const { data: insertedKaryawan, error: errorKaryawan } = await supabase
      .from('karyawan')
      .insert([{ nama: newEmployee.name, jabatan: '-' }])
      .select();

    if (errorKaryawan) {
      toast.error('Gagal menyimpan karyawan!', { description: errorKaryawan.message });
      return;
    }

    const newKaryawanId = insertedKaryawan[0].id;

    const kriteriaMapping = [
      { kriteria_id: 1, nilai: newEmployee.kejujuran },
      { kriteria_id: 2, nilai: newEmployee.kesetiaan },
      { kriteria_id: 3, nilai: newEmployee.sikap },
      { kriteria_id: 4, nilai: newEmployee.produktivitas },
      { kriteria_id: 5, nilai: newEmployee.disiplin },
      { kriteria_id: 6, nilai: newEmployee.kerjasama },
    ];

    const penilaianData = kriteriaMapping.map(item => ({
      karyawan_id: newKaryawanId,
      kriteria_id: item.kriteria_id,
      nilai: item.nilai
    }));

    const { error: errorPenilaian } = await supabase
      .from('penilaian')
      .insert(penilaianData);

    if (errorPenilaian) {
      toast.error('Gagal menyimpan nilai kompetensi!');
      await supabase.from('karyawan').delete().eq('id', newKaryawanId);
      return;
    }

    const employee: Employee = {
      id: newKaryawanId.toString(),
      ...newEmployee,
    };

    setEmployees([...employees, employee]);
    setNewEmployee({
      name: '', kejujuran: 3, kesetiaan: 3, sikap: 3, produktivitas: 3, disiplin: 3, kerjasama: 3,
    });
    setOpenDialog(false);
    toast.success('Karyawan & Nilai berhasil ditambahkan!');
  };

  // 3. UPDATE (Fungsi Baru untuk Edit)
  const handleEditClick = (emp: Employee) => {
    setEditingEmployee({ ...emp });
    setOpenEditDialog(true);
  };

  const updateEmployee = async () => {
    if (!editingEmployee || !editingEmployee.name.trim()) {
      toast.error('Nama karyawan harus diisi');
      return;
    }

    const empId = editingEmployee.id;

    // A. Update nama di tabel karyawan
    const { error: errorKaryawan } = await supabase
      .from('karyawan')
      .update({ nama: editingEmployee.name })
      .eq('id', empId);

    if (errorKaryawan) {
      toast.error('Gagal memperbarui nama karyawan!');
      return;
    }

    // B. Update nilai di tabel penilaian (Cara teraman: hapus yg lama, insert yg baru)
    await supabase.from('penilaian').delete().eq('karyawan_id', empId);

    const kriteriaMapping = [
      { kriteria_id: 1, nilai: editingEmployee.kejujuran },
      { kriteria_id: 2, nilai: editingEmployee.kesetiaan },
      { kriteria_id: 3, nilai: editingEmployee.sikap },
      { kriteria_id: 4, nilai: editingEmployee.produktivitas },
      { kriteria_id: 5, nilai: editingEmployee.disiplin },
      { kriteria_id: 6, nilai: editingEmployee.kerjasama },
    ];

    const penilaianData = kriteriaMapping.map(item => ({
      karyawan_id: empId,
      kriteria_id: item.kriteria_id,
      nilai: item.nilai
    }));

    const { error: errorPenilaian } = await supabase
      .from('penilaian')
      .insert(penilaianData);

    if (errorPenilaian) {
      toast.error('Gagal memperbarui nilai kompetensi!');
      return;
    }

    // C. Update State UI
    setEmployees(employees.map(emp => emp.id === empId ? editingEmployee : emp));
    setOpenEditDialog(false);
    setEditingEmployee(null);
    toast.success('Data karyawan berhasil diperbarui!');
  };

  // 4. DELETE
  const deleteEmployee = async (id: string) => {
    const emp = employees.find(e => e.id === id);
    await supabase.from('penilaian').delete().eq('karyawan_id', id);
    const { error } = await supabase.from('karyawan').delete().eq('id', id);

    if (error) {
      toast.error('Gagal menghapus data dari database');
      return;
    }

    setEmployees(employees.filter((emp) => emp.id !== id));
    toast.success('Karyawan berhasil dihapus', {
      description: `${emp?.name} telah dihapus dari sistem`,
    });
  };

  const calculateProfileMatching = (): CalculationResult[] => {
    if (employees.length === 0) return [];

    const results: CalculationResult[] = employees.map((employee) => {
      const gaps = [
        employee.kejujuran - gapValues.kejujuran,
        employee.kesetiaan - gapValues.kesetiaan,
        employee.sikap - gapValues.sikap,
        employee.produktivitas - gapValues.produktivitas,
        employee.disiplin - gapValues.disiplin,
        employee.kerjasama - gapValues.kerjasama,
      ];

      const weights = gaps.map((gap) => {
        const clampedGap = Math.max(-4, Math.min(4, gap));
        return GAP_WEIGHTS[clampedGap] || 5;
      });

      const ncf = (weights[0] + weights[1] + weights[2] + weights[3]) / 4;
      const nsf = (weights[4] + weights[5]) / 2;
      const total = (coreFactorPercent / 100) * ncf + (secondaryFactorPercent / 100) * nsf;

      return {
        employee,
        gaps,
        weights,
        ncf,
        nsf,
        total,
        rank: 0,
      };
    });

    results.sort((a, b) => b.total - a.total);
    results.forEach((result, index) => {
      result.rank = index + 1;
    });

    return results;
  };

  const results = calculateProfileMatching();

  const getRadarChartData = (employee: Employee) => {
    return [
      { subject: 'Kejujuran', value: employee.kejujuran, fullMark: 5 },
      { subject: 'Kesetiaan', value: employee.kesetiaan, fullMark: 5 },
      { subject: 'Sikap', value: employee.sikap, fullMark: 5 },
      { subject: 'Produktivitas', value: employee.produktivitas, fullMark: 5 },
      { subject: 'Disiplin', value: employee.disiplin, fullMark: 5 },
      { subject: 'Kerjasama', value: employee.kerjasama, fullMark: 5 },
    ];
  };

  const getBarChartData = () => {
    return results.map(r => ({
      name: r.employee.name,
      'Nilai Total': Number(r.total.toFixed(2)),
      NCF: Number(r.ncf.toFixed(2)),
      NSF: Number(r.nsf.toFixed(2)),
    }));
  };

  return (
    <>
      <Toaster position="top-right" richColors expand={true} />
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
        {/* Hero Section */}
        <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white py-12 px-8 shadow-2xl">
          <div className="max-w-7xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-center"
            >
              <div className="flex items-center justify-center mb-4">
                <Award className="h-12 w-12 mr-3" />
                <h1 className="text-5xl font-bold">
                  Sistem Pendukung Keputusan
                </h1>
              </div>
              <h2 className="text-2xl font-light opacity-90 mb-3">
                Pemilihan Karyawan Terbaik
              </h2>
              <div className="inline-flex items-center bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full">
                <Sparkles className="h-4 w-4 mr-2" />
                <span className="text-sm">Metode Profile Matching</span>
              </div>
            </motion.div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-8 py-8">
          {/* Stats Cards */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8"
          >
            <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0 shadow-xl">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-blue-100 text-sm font-medium">Total Karyawan</p>
                    <p className="text-4xl font-bold mt-2">{employees.length}</p>
                  </div>
                  <Users className="h-12 w-12 opacity-80" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white border-0 shadow-xl">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-purple-100 text-sm font-medium">Kriteria Penilaian</p>
                    <p className="text-4xl font-bold mt-2">6</p>
                  </div>
                  <Target className="h-12 w-12 opacity-80" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-pink-500 to-pink-600 text-white border-0 shadow-xl">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-pink-100 text-sm font-medium">Karyawan Terbaik</p>
                    <p className="text-2xl font-bold mt-2 truncate">
                      {results.length > 0 ? results[0].employee.name : '-'}
                    </p>
                  </div>
                  <Trophy className="h-12 w-12 opacity-80" />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <Tabs defaultValue="employees" className="w-full">
            <TabsList className="grid w-full grid-cols-4 bg-white shadow-md h-14 p-1">
              <TabsTrigger value="employees" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-indigo-50 data-[state=active]:to-purple-50 data-[state=active]:text-indigo-600">
                <Users className="h-4 w-4 mr-2" />
                Data Karyawan
              </TabsTrigger>
              <TabsTrigger value="criteria" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-indigo-50 data-[state=active]:to-purple-50 data-[state=active]:text-indigo-600">
                <Settings className="h-4 w-4 mr-2" />
                Kriteria & GAP
              </TabsTrigger>
              <TabsTrigger value="calculation" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-indigo-50 data-[state=active]:to-purple-50 data-[state=active]:text-indigo-600">
                <Calculator className="h-4 w-4 mr-2" />
                Perhitungan
              </TabsTrigger>
              <TabsTrigger value="ranking" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-indigo-50 data-[state=active]:to-purple-50 data-[state=active]:text-indigo-600">
                <Trophy className="h-4 w-4 mr-2" />
                Peringkat
              </TabsTrigger>
            </TabsList>

            <TabsContent value="employees">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
              >
                <Card className="shadow-xl border-0">
                  <CardHeader className="bg-gradient-to-r from-indigo-50 to-purple-50">
                    <CardTitle className="flex items-center text-2xl">
                      <Users className="mr-2 h-6 w-6 text-indigo-600" />
                      Data Karyawan
                    </CardTitle>
                    <CardDescription>
                      Kelola data karyawan yang akan dinilai dalam sistem
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-6">
                    <Dialog open={openDialog} onOpenChange={setOpenDialog}>
                      <DialogTrigger asChild>
                        <Button className="mb-6 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-lg">
                          <Plus className="mr-2 h-4 w-4" />
                          Tambah Karyawan Baru
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle className="text-2xl flex items-center">
                            <Sparkles className="mr-2 h-6 w-6 text-indigo-600" />
                            Tambah Karyawan Baru
                          </DialogTitle>
                          <DialogDescription>
                            Masukkan data lengkap karyawan dan penilaian untuk setiap kriteria
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-5 py-4">
                          <div className="bg-gradient-to-r from-indigo-50 to-purple-50 p-4 rounded-lg">
                            <Label htmlFor="name" className="text-base font-semibold">Nama Karyawan</Label>
                            <Input
                              id="name"
                              value={newEmployee.name}
                              onChange={(e) =>
                                setNewEmployee({ ...newEmployee, name: e.target.value })
                              }
                              placeholder="Masukkan nama lengkap karyawan"
                              className="mt-2 h-11"
                            />
                          </div>

                          <div className="space-y-4">
                            <h4 className="font-semibold text-lg flex items-center text-indigo-700">
                              <Star className="h-5 w-5 mr-2" />
                              Core Factor (Faktor Utama)
                            </h4>

                            {['kejujuran', 'kesetiaan', 'sikap', 'produktivitas'].map((key) => (
                              <div key={key} className="bg-gray-50 p-4 rounded-lg">
                                <Label className="text-base font-medium">{CRITERIA_LABELS[key as keyof typeof CRITERIA_LABELS]} (C{['kejujuran', 'kesetiaan', 'sikap', 'produktivitas', 'disiplin', 'kerjasama'].indexOf(key) + 1})</Label>
                                <Select
                                  value={newEmployee[key as keyof typeof newEmployee].toString()}
                                  onValueChange={(value) =>
                                    setNewEmployee({ ...newEmployee, [key]: Number(value) })
                                  }
                                >
                                  <SelectTrigger className="mt-2 h-11">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {CRITERIA_OPTIONS[key as keyof typeof CRITERIA_OPTIONS].map((opt) => (
                                      <SelectItem key={opt.value} value={opt.value.toString()}>
                                        {opt.value} - {opt.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            ))}

                            <h4 className="font-semibold text-lg flex items-center text-purple-700 pt-4">
                              <CheckCircle2 className="h-5 w-5 mr-2" />
                              Secondary Factor (Faktor Kedua)
                            </h4>

                            {['disiplin', 'kerjasama'].map((key) => (
                              <div key={key} className="bg-gray-50 p-4 rounded-lg">
                                <Label className="text-base font-medium">{CRITERIA_LABELS[key as keyof typeof CRITERIA_LABELS]} (C{['kejujuran', 'kesetiaan', 'sikap', 'produktivitas', 'disiplin', 'kerjasama'].indexOf(key) + 1})</Label>
                                <Select
                                  value={newEmployee[key as keyof typeof newEmployee].toString()}
                                  onValueChange={(value) =>
                                    setNewEmployee({ ...newEmployee, [key]: Number(value) })
                                  }
                                >
                                  <SelectTrigger className="mt-2 h-11">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {CRITERIA_OPTIONS[key as keyof typeof CRITERIA_OPTIONS].map((opt) => (
                                      <SelectItem key={opt.value} value={opt.value.toString()}>
                                        {opt.value} - {opt.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            ))}
                          </div>
                        </div>
                        <DialogFooter>
                          <Button onClick={addEmployee} className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 px-6">
                            <Plus className="mr-2 h-4 w-4" />
                            Simpan Karyawan
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>

                    {/* DIALOG EDIT KARYAWAN */}
                    <Dialog open={openEditDialog} onOpenChange={setOpenEditDialog}>
                      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle className="text-2xl flex items-center">
                            <Edit className="mr-2 h-6 w-6 text-indigo-600" />
                            Edit Data Karyawan
                          </DialogTitle>
                          <DialogDescription>
                            Perbarui nama atau nilai kriteria dari karyawan ini.
                          </DialogDescription>
                        </DialogHeader>
                        {editingEmployee && (
                          <div className="space-y-5 py-4">
                            <div className="bg-gradient-to-r from-indigo-50 to-purple-50 p-4 rounded-lg">
                              <Label htmlFor="edit-name" className="text-base font-semibold">Nama Karyawan</Label>
                              <Input
                                id="edit-name"
                                value={editingEmployee.name}
                                onChange={(e) =>
                                  setEditingEmployee({ ...editingEmployee, name: e.target.value })
                                }
                                className="mt-2 h-11"
                              />
                            </div>

                            <div className="space-y-4">
                              <h4 className="font-semibold text-lg flex items-center text-indigo-700">
                                <Star className="h-5 w-5 mr-2" />
                                Core Factor (Faktor Utama)
                              </h4>

                              {['kejujuran', 'kesetiaan', 'sikap', 'produktivitas'].map((key) => (
                                <div key={key} className="bg-gray-50 p-4 rounded-lg">
                                  <Label className="text-base font-medium">{CRITERIA_LABELS[key as keyof typeof CRITERIA_LABELS]} (C{['kejujuran', 'kesetiaan', 'sikap', 'produktivitas', 'disiplin', 'kerjasama'].indexOf(key) + 1})</Label>
                                  <Select
                                    value={editingEmployee[key as keyof typeof editingEmployee].toString()}
                                    onValueChange={(value) =>
                                      setEditingEmployee({ ...editingEmployee, [key]: Number(value) })
                                    }
                                  >
                                    <SelectTrigger className="mt-2 h-11">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {CRITERIA_OPTIONS[key as keyof typeof CRITERIA_OPTIONS].map((opt) => (
                                        <SelectItem key={opt.value} value={opt.value.toString()}>
                                          {opt.value} - {opt.label}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                              ))}

                              <h4 className="font-semibold text-lg flex items-center text-purple-700 pt-4">
                                <CheckCircle2 className="h-5 w-5 mr-2" />
                                Secondary Factor (Faktor Kedua)
                              </h4>

                              {['disiplin', 'kerjasama'].map((key) => (
                                <div key={key} className="bg-gray-50 p-4 rounded-lg">
                                  <Label className="text-base font-medium">{CRITERIA_LABELS[key as keyof typeof CRITERIA_LABELS]} (C{['kejujuran', 'kesetiaan', 'sikap', 'produktivitas', 'disiplin', 'kerjasama'].indexOf(key) + 1})</Label>
                                  <Select
                                    value={editingEmployee[key as keyof typeof editingEmployee].toString()}
                                    onValueChange={(value) =>
                                      setEditingEmployee({ ...editingEmployee, [key]: Number(value) })
                                    }
                                  >
                                    <SelectTrigger className="mt-2 h-11">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {CRITERIA_OPTIONS[key as keyof typeof CRITERIA_OPTIONS].map((opt) => (
                                        <SelectItem key={opt.value} value={opt.value.toString()}>
                                          {opt.value} - {opt.label}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        <DialogFooter>
                          <Button onClick={updateEmployee} className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 px-6">
                            Simpan Perubahan
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>

                    {employees.length === 0 ? (
                      <div className="text-center py-16">
                        <Users className="h-24 w-24 mx-auto text-gray-300 mb-4" />
                        <p className="text-gray-500 text-lg">Belum ada data karyawan</p>
                        <p className="text-gray-400 text-sm mt-2">Klik tombol "Tambah Karyawan Baru" untuk memulai</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <AnimatePresence>
                          {employees.map((emp, index) => (
                            <motion.div
                              key={emp.id}
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              exit={{ opacity: 0, x: 20 }}
                              transition={{ duration: 0.3, delay: index * 0.05 }}
                            >
                              <Card className="hover:shadow-lg transition-all duration-300 border-l-4 border-l-indigo-500">
                                <CardContent className="p-6">
                                  <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-xl font-semibold text-gray-800">{emp.name}</h3>
                                    {/* TAMBAHAN TOMBOL EDIT DI SINI */}
                                    <div className="flex gap-2">
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleEditClick(emp)}
                                        className="hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
                                      >
                                        <Edit className="h-4 w-4" />
                                      </Button>
                                      <Button
                                        variant="destructive"
                                        size="sm"
                                        onClick={() => deleteEmployee(emp.id)}
                                        className="hover:scale-105 transition-transform"
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  </div>
                                  <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                                    {[
                                      { key: 'kejujuran', label: 'C1', color: 'bg-blue-100 text-blue-700' },
                                      { key: 'kesetiaan', label: 'C2', color: 'bg-purple-100 text-purple-700' },
                                      { key: 'sikap', label: 'C3', color: 'bg-pink-100 text-pink-700' },
                                      { key: 'produktivitas', label: 'C4', color: 'bg-orange-100 text-orange-700' },
                                      { key: 'disiplin', label: 'C5', color: 'bg-green-100 text-green-700' },
                                      { key: 'kerjasama', label: 'C6', color: 'bg-indigo-100 text-indigo-700' },
                                    ].map(({ key, label, color }) => (
                                      <div key={key} className={`${color} p-3 rounded-lg text-center`}>
                                        <div className="text-xs font-medium opacity-75">{label}</div>
                                        <div className="text-2xl font-bold mt-1">{emp[key as keyof Employee]}</div>
                                      </div>
                                    ))}
                                  </div>
                                </CardContent>
                              </Card>
                            </motion.div>
                          ))}
                        </AnimatePresence>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            </TabsContent>

            <TabsContent value="criteria">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
              >
                <Card className="shadow-xl border-0">
                  <CardHeader className="bg-gradient-to-r from-indigo-50 to-purple-50">
                    <CardTitle className="flex items-center text-2xl">
                      <Settings className="mr-2 h-6 w-6 text-indigo-600" />
                      Pengaturan Kriteria & Nilai GAP
                    </CardTitle>
                    <CardDescription>
                      Tentukan profil ideal dan konfigurasi bobot untuk perhitungan
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-6 space-y-8">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                      <div className="space-y-6">
                        <div className="bg-gradient-to-br from-indigo-50 to-purple-50 p-6 rounded-xl">
                          <h3 className="font-semibold text-xl mb-4 flex items-center text-indigo-700">
                            <Target className="h-5 w-5 mr-2" />
                            Nilai Minimal (Profil Ideal)
                          </h3>
                          <div className="space-y-4">
                            {Object.entries(CRITERIA_LABELS).map(([key, label], index) => (
                              <div key={key} className="bg-white p-4 rounded-lg shadow-sm">
                                <Label className="font-medium text-gray-700">{label}</Label>
                                <Select
                                  value={gapValues[key as keyof typeof gapValues].toString()}
                                  onValueChange={(value) =>
                                    setGapValues({ ...gapValues, [key]: Number(value) })
                                  }
                                >
                                  <SelectTrigger className="mt-2 h-11">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {[5, 4, 3, 2, 1].map((val) => (
                                      <SelectItem key={val} value={val.toString()}>
                                        <div className="flex items-center">
                                          <span className="font-semibold mr-2">{val}</span>
                                          <div className="flex">
                                            {[...Array(val)].map((_, i) => (
                                              <Star key={i} className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                                            ))}
                                          </div>
                                        </div>
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-6 rounded-xl">
                          <h3 className="font-semibold text-xl mb-4 flex items-center text-purple-700">
                            <TrendingUp className="h-5 w-5 mr-2" />
                            Persentase Faktor
                          </h3>
                          <div className="space-y-4">
                            <div className="bg-white p-4 rounded-lg shadow-sm">
                              <Label className="font-medium text-gray-700">Core Factor (%)</Label>
                              <div className="flex items-center gap-3 mt-2">
                                <Input
                                  type="number"
                                  min="0"
                                  max="100"
                                  value={coreFactorPercent}
                                  onChange={(e) => {
                                    const val = Number(e.target.value);
                                    setCoreFactorPercent(val);
                                    setSecondaryFactorPercent(100 - val);
                                  }}
                                  className="h-11"
                                />
                                <div className="text-3xl font-bold text-indigo-600 min-w-[80px]">
                                  {coreFactorPercent}%
                                </div>
                              </div>
                              <p className="text-xs text-gray-500 mt-2 bg-indigo-50 p-2 rounded">
                                Kejujuran, Kesetiaan, Sikap, Produktivitas
                              </p>
                            </div>
                            <div className="bg-white p-4 rounded-lg shadow-sm">
                              <Label className="font-medium text-gray-700">Secondary Factor (%)</Label>
                              <div className="flex items-center gap-3 mt-2">
                                <Input
                                  type="number"
                                  min="0"
                                  max="100"
                                  value={secondaryFactorPercent}
                                  onChange={(e) => {
                                    const val = Number(e.target.value);
                                    setSecondaryFactorPercent(val);
                                    setCoreFactorPercent(100 - val);
                                  }}
                                  className="h-11"
                                />
                                <div className="text-3xl font-bold text-purple-600 min-w-[80px]">
                                  {secondaryFactorPercent}%
                                </div>
                              </div>
                              <p className="text-xs text-gray-500 mt-2 bg-purple-50 p-2 rounded">
                                Disiplin, Kemampuan Bekerja Sama
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-xl">
                        <h4 className="font-semibold text-xl mb-4 flex items-center text-indigo-700">
                          <BarChart3 className="h-5 w-5 mr-2" />
                          Tabel Bobot Nilai GAP
                        </h4>
                        <div className="bg-white rounded-lg shadow-md overflow-hidden">
                          <Table>
                            <TableHeader>
                              <TableRow className="bg-gradient-to-r from-indigo-500 to-purple-500">
                                <TableHead className="text-white font-semibold">Selisih GAP</TableHead>
                                <TableHead className="text-white font-semibold">Bobot Nilai</TableHead>
                                <TableHead className="text-white font-semibold">Keterangan</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {Object.entries(GAP_WEIGHTS).sort((a, b) => Number(b[0]) - Number(a[0])).map(([gap, weight], index) => (
                                <TableRow key={gap} className={index % 2 === 0 ? 'bg-gray-50' : ''}>
                                  <TableCell className="font-bold text-center">
                                    <span className={Number(gap) === 0 ? 'text-green-600' : Number(gap) > 0 ? 'text-blue-600' : 'text-orange-600'}>
                                      {gap}
                                    </span>
                                  </TableCell>
                                  <TableCell className="text-center">
                                    <Badge variant={weight === 5 ? 'default' : 'secondary'} className={weight === 5 ? 'bg-green-500' : ''}>
                                      {weight}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="text-sm text-gray-600">
                                    {Number(gap) === 0 ? 'Sesuai kompetensi' :
                                     Number(gap) > 0 ? `Kelebihan ${gap} tingkat` :
                                     `Kekurangan ${Math.abs(Number(gap))} tingkat`}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </TabsContent>

            <TabsContent value="calculation">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
              >
                <Card className="shadow-xl border-0">
                  <CardHeader className="bg-gradient-to-r from-indigo-50 to-purple-50">
                    <CardTitle className="flex items-center text-2xl">
                      <Calculator className="mr-2 h-6 w-6 text-indigo-600" />
                      Detail Perhitungan Profile Matching
                    </CardTitle>
                    <CardDescription>
                      Langkah-langkah perhitungan lengkap untuk setiap karyawan
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-6">
                    {results.length === 0 ? (
                      <div className="text-center py-16">
                        <Calculator className="h-24 w-24 mx-auto text-gray-300 mb-4" />
                        <p className="text-gray-500 text-lg">Belum ada data untuk dihitung</p>
                        <p className="text-gray-400 text-sm mt-2">Tambahkan karyawan terlebih dahulu</p>
                      </div>
                    ) : (
                      <div className="space-y-8">
                        <AnimatePresence>
                          {results.map((result, index) => (
                            <motion.div
                              key={result.employee.id}
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ duration: 0.4, delay: index * 0.1 }}
                            >
                              <Card className="border-2 border-indigo-100 hover:border-indigo-300 transition-all duration-300 overflow-hidden">
                                <div className="bg-gradient-to-r from-indigo-500 to-purple-500 p-4">
                                  <h3 className="text-2xl font-bold text-white flex items-center">
                                    <Award className="mr-2 h-6 w-6" />
                                    {result.employee.name}
                                    <Badge className="ml-3 bg-white text-indigo-600">
                                      Rank #{result.rank}
                                    </Badge>
                                  </h3>
                                </div>
                                <CardContent className="p-6 space-y-6">
                                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                    <div>
                                      <h4 className="font-semibold mb-3 text-lg flex items-center text-indigo-700">
                                        <CheckCircle2 className="h-5 w-5 mr-2" />
                                        Nilai Kriteria
                                      </h4>
                                      <div className="grid grid-cols-3 gap-3">
                                        {[
                                          { val: result.employee.kejujuran, label: 'C1', color: 'from-blue-400 to-blue-600' },
                                          { val: result.employee.kesetiaan, label: 'C2', color: 'from-purple-400 to-purple-600' },
                                          { val: result.employee.sikap, label: 'C3', color: 'from-pink-400 to-pink-600' },
                                          { val: result.employee.produktivitas, label: 'C4', color: 'from-orange-400 to-orange-600' },
                                          { val: result.employee.disiplin, label: 'C5', color: 'from-green-400 to-green-600' },
                                          { val: result.employee.kerjasama, label: 'C6', color: 'from-indigo-400 to-indigo-600' },
                                        ].map(({ val, label, color }, i) => (
                                          <div key={i} className={`bg-gradient-to-br ${color} text-white p-3 rounded-lg text-center shadow-md`}>
                                            <div className="text-xs font-medium opacity-90">{label}</div>
                                            <div className="text-2xl font-bold mt-1">{val}</div>
                                          </div>
                                        ))}
                                      </div>

                                      <h4 className="font-semibold mb-3 mt-6 text-lg flex items-center text-orange-700">
                                        <TrendingUp className="h-5 w-5 mr-2" />
                                        Nilai GAP (Selisih)
                                      </h4>
                                      <div className="grid grid-cols-3 gap-3">
                                        {result.gaps.map((gap, idx) => (
                                          <div key={idx} className={`p-3 rounded-lg text-center shadow-md ${gap >= 0 ? 'bg-green-100 border-2 border-green-300' : 'bg-red-100 border-2 border-red-300'}`}>
                                            <div className="text-xs font-medium text-gray-600">C{idx + 1}</div>
                                            <div className={`text-2xl font-bold mt-1 ${gap >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                                              {gap > 0 ? '+' : ''}{gap}
                                            </div>
                                          </div>
                                        ))}
                                      </div>

                                      <h4 className="font-semibold mb-3 mt-6 text-lg flex items-center text-purple-700">
                                        <Star className="h-5 w-5 mr-2" />
                                        Bobot Nilai
                                      </h4>
                                      <div className="grid grid-cols-3 gap-3">
                                        {result.weights.map((weight, idx) => (
                                          <div key={idx} className="bg-gradient-to-br from-purple-100 to-pink-100 p-3 rounded-lg text-center shadow-md border-2 border-purple-200">
                                            <div className="text-xs font-medium text-purple-600">C{idx + 1}</div>
                                            <div className="text-2xl font-bold text-purple-700 mt-1">{weight}</div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>

                                    <div>
                                      <h4 className="font-semibold mb-3 text-lg text-indigo-700">Visualisasi Radar</h4>
                                      <div className="bg-white p-4 rounded-lg shadow-md">
                                        <ResponsiveContainer width="100%" height={300}>
                                          <RadarChart data={getRadarChartData(result.employee)}>
                                            <PolarGrid stroke="#e0e7ff" />
                                            <PolarAngleAxis dataKey="subject" tick={{ fill: '#4f46e5', fontSize: 12 }} />
                                            <PolarRadiusAxis angle={90} domain={[0, 5]} tick={{ fill: '#6366f1' }} />
                                            <Radar name={result.employee.name} dataKey="value" stroke="#8b5cf6" fill="#a78bfa" fillOpacity={0.6} />
                                          </RadarChart>
                                        </ResponsiveContainer>
                                      </div>
                                    </div>
                                  </div>

                                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                                    <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-6 rounded-xl shadow-lg text-white">
                                      <h4 className="font-semibold mb-1 text-sm opacity-90">NCF (Core Factor)</h4>
                                      <p className="text-xs mb-3 opacity-75">(C1 + C2 + C3 + C4) / 4</p>
                                      <p className="text-4xl font-bold">{result.ncf.toFixed(2)}</p>
                                    </div>
                                    <div className="bg-gradient-to-br from-green-500 to-green-600 p-6 rounded-xl shadow-lg text-white">
                                      <h4 className="font-semibold mb-1 text-sm opacity-90">NSF (Secondary Factor)</h4>
                                      <p className="text-xs mb-3 opacity-75">(C5 + C6) / 2</p>
                                      <p className="text-4xl font-bold">{result.nsf.toFixed(2)}</p>
                                    </div>
                                    <div className="bg-gradient-to-br from-purple-500 to-pink-500 p-6 rounded-xl shadow-lg text-white">
                                      <h4 className="font-semibold mb-1 text-sm opacity-90">Nilai Total</h4>
                                      <p className="text-xs mb-3 opacity-75">
                                        ({coreFactorPercent}% × NCF) + ({secondaryFactorPercent}% × NSF)
                                      </p>
                                      <p className="text-4xl font-bold">{result.total.toFixed(2)}</p>
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            </motion.div>
                          ))}
                        </AnimatePresence>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            </TabsContent>

            <TabsContent value="ranking">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
              >
                <Card className="shadow-xl border-0">
                  <CardHeader className="bg-gradient-to-r from-indigo-50 to-purple-50">
                    <CardTitle className="flex items-center text-2xl">
                      <Trophy className="mr-2 h-6 w-6 text-indigo-600" />
                      Peringkat Karyawan Terbaik
                    </CardTitle>
                    <CardDescription>
                      Hasil akhir peringkat berdasarkan metode Profile Matching
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-6">
                    {results.length === 0 ? (
                      <div className="text-center py-16">
                        <Trophy className="h-24 w-24 mx-auto text-gray-300 mb-4" />
                        <p className="text-gray-500 text-lg">Belum ada data untuk diperingkat</p>
                        <p className="text-gray-400 text-sm mt-2">Tambahkan karyawan terlebih dahulu</p>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        {/* Podium Section */}
                        {results.length >= 3 && (
                          <div className="grid grid-cols-3 gap-4 mb-8">
                            {/* 2nd Place */}
                            <motion.div
                              initial={{ opacity: 0, y: 50 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ duration: 0.6, delay: 0.1 }}
                              className="flex flex-col items-center"
                            >
                              <div className="bg-gradient-to-br from-gray-300 to-gray-400 w-20 h-20 rounded-full flex items-center justify-center text-white text-3xl font-bold shadow-xl mb-3">
                                2
                              </div>
                              <Card className="w-full bg-gradient-to-br from-gray-50 to-gray-100 border-2 border-gray-300">
                                <CardContent className="p-4 text-center">
                                  <p className="font-bold text-lg truncate">{results[1].employee.name}</p>
                                  <p className="text-2xl font-bold text-gray-600 mt-2">{results[1].total.toFixed(2)}</p>
                                </CardContent>
                              </Card>
                            </motion.div>

                            {/* 1st Place */}
                            <motion.div
                              initial={{ opacity: 0, y: 50 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ duration: 0.6 }}
                              className="flex flex-col items-center -mt-4"
                            >
                              <Trophy className="h-12 w-12 text-yellow-400 mb-2" />
                              <div className="bg-gradient-to-br from-yellow-400 to-yellow-500 w-24 h-24 rounded-full flex items-center justify-center text-white text-4xl font-bold shadow-2xl mb-3 ring-4 ring-yellow-200">
                                1
                              </div>
                              <Card className="w-full bg-gradient-to-br from-yellow-50 to-amber-100 border-4 border-yellow-400 shadow-xl">
                                <CardContent className="p-4 text-center">
                                  <Badge className="bg-yellow-500 mb-2">TERBAIK</Badge>
                                  <p className="font-bold text-xl truncate">{results[0].employee.name}</p>
                                  <p className="text-3xl font-bold text-yellow-600 mt-2">{results[0].total.toFixed(2)}</p>
                                </CardContent>
                              </Card>
                            </motion.div>

                            {/* 3rd Place */}
                            <motion.div
                              initial={{ opacity: 0, y: 50 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ duration: 0.6, delay: 0.2 }}
                              className="flex flex-col items-center"
                            >
                              <div className="bg-gradient-to-br from-orange-400 to-orange-500 w-20 h-20 rounded-full flex items-center justify-center text-white text-3xl font-bold shadow-xl mb-3">
                                3
                              </div>
                              <Card className="w-full bg-gradient-to-br from-orange-50 to-orange-100 border-2 border-orange-300">
                                <CardContent className="p-4 text-center">
                                  <p className="font-bold text-lg truncate">{results[2].employee.name}</p>
                                  <p className="text-2xl font-bold text-orange-600 mt-2">{results[2].total.toFixed(2)}</p>
                                </CardContent>
                              </Card>
                            </motion.div>
                          </div>
                        )}

                        {/* Chart Visualization */}
                        <Card className="bg-gradient-to-br from-indigo-50 to-purple-50 border-0 shadow-lg">
                          <CardHeader>
                            <CardTitle className="flex items-center">
                              <BarChart3 className="mr-2 h-5 w-5 text-indigo-600" />
                              Visualisasi Perbandingan
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <ResponsiveContainer width="100%" height={300}>
                              <BarChart data={getBarChartData()}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e0e7ff" />
                                <XAxis dataKey="name" tick={{ fill: '#4f46e5' }} />
                                <YAxis tick={{ fill: '#4f46e5' }} />
                                <Tooltip contentStyle={{ backgroundColor: '#fff', border: '2px solid #8b5cf6', borderRadius: '8px' }} />
                                <Legend />
                                <Bar dataKey="Nilai Total" fill="#8b5cf6" radius={[8, 8, 0, 0]}>
                                  {getBarChartData().map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                  ))}
                                </Bar>
                                <Bar dataKey="NCF" fill="#3b82f6" radius={[8, 8, 0, 0]} />
                                <Bar dataKey="NSF" fill="#10b981" radius={[8, 8, 0, 0]} />
                              </BarChart>
                            </ResponsiveContainer>
                          </CardContent>
                        </Card>

                        {/* Full Ranking Table */}
                        <Card className="shadow-lg">
                          <CardHeader>
                            <CardTitle>Tabel Peringkat Lengkap</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <Table>
                              <TableHeader>
                                <TableRow className="bg-gradient-to-r from-indigo-500 to-purple-500">
                                  <TableHead className="text-white font-semibold text-center">Peringkat</TableHead>
                                  <TableHead className="text-white font-semibold">Nama Karyawan</TableHead>
                                  <TableHead className="text-white font-semibold text-center">NCF</TableHead>
                                  <TableHead className="text-white font-semibold text-center">NSF</TableHead>
                                  <TableHead className="text-white font-semibold text-center">Nilai Total</TableHead>
                                  <TableHead className="text-white font-semibold text-center">Status</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {results.map((result, index) => (
                                  <TableRow key={result.employee.id} className={index % 2 === 0 ? 'bg-gray-50' : ''}>
                                    <TableCell className="text-center">
                                      <Badge
                                        className={
                                          result.rank === 1
                                            ? 'bg-gradient-to-r from-yellow-400 to-yellow-500 text-white shadow-lg'
                                            : result.rank === 2
                                            ? 'bg-gradient-to-r from-gray-300 to-gray-400 text-white'
                                            : result.rank === 3
                                            ? 'bg-gradient-to-r from-orange-400 to-orange-500 text-white'
                                            : 'bg-gray-200 text-gray-700'
                                        }
                                      >
                                        #{result.rank}
                                      </Badge>
                                    </TableCell>
                                    <TableCell className="font-semibold text-gray-800">
                                      {result.employee.name}
                                      {result.rank === 1 && (
                                        <Trophy className="inline ml-2 h-5 w-5 text-yellow-500" />
                                      )}
                                    </TableCell>
                                    <TableCell className="text-center">
                                      <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                                        {result.ncf.toFixed(2)}
                                      </Badge>
                                    </TableCell>
                                    <TableCell className="text-center">
                                      <Badge variant="secondary" className="bg-green-100 text-green-700">
                                        {result.nsf.toFixed(2)}
                                      </Badge>
                                    </TableCell>
                                    <TableCell className="text-center">
                                      <Badge variant="secondary" className="bg-purple-100 text-purple-700 text-base font-bold">
                                        {result.total.toFixed(2)}
                                      </Badge>
                                    </TableCell>
                                    <TableCell className="text-center">
                                      {result.rank === 1 && (
                                        <Badge className="bg-gradient-to-r from-green-500 to-emerald-600 text-white">
                                          <Star className="h-3 w-3 mr-1" />
                                          Karyawan Terbaik
                                        </Badge>
                                      )}
                                      {result.rank === 2 && (
                                        <Badge className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
                                          Kandidat Kuat
                                        </Badge>
                                      )}
                                      {result.rank === 3 && (
                                        <Badge className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
                                          Kandidat Baik
                                        </Badge>
                                      )}
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </CardContent>
                        </Card>

                        {/* Recommendation Card */}
                        {results.length > 0 && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.5 }}
                          >
                            <Card className="bg-gradient-to-br from-green-500 to-emerald-600 border-0 shadow-2xl text-white overflow-hidden">
                              <div className="absolute top-0 right-0 opacity-10">
                                <Award className="h-64 w-64" />
                              </div>
                              <CardContent className="p-8 relative z-10">
                                <div className="flex items-start gap-4">
                                  <div className="bg-white/20 p-4 rounded-full backdrop-blur-sm">
                                    <Sparkles className="h-8 w-8" />
                                  </div>
                                  <div>
                                    <h3 className="text-2xl font-bold mb-3">Rekomendasi Sistem</h3>
                                    <p className="text-green-50 text-lg leading-relaxed">
                                      Berdasarkan perhitungan metode Profile Matching, karyawan dengan peringkat tertinggi adalah{' '}
                                      <span className="font-bold text-white text-xl">{results[0].employee.name}</span> dengan
                                      nilai total <span className="font-bold text-white text-xl">{results[0].total.toFixed(2)}</span>.
                                    </p>
                                    <p className="text-green-50 mt-3 text-lg">
                                      Karyawan ini sangat direkomendasikan untuk mendapatkan promosi jabatan atau
                                      bonus sesuai kebijakan perusahaan.
                                    </p>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          </motion.div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </>
  );
}