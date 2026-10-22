// Mengirim konfigurasi publik Supabase ke browser (anon key memang aman dipublikasikan,
// keamanan data dijaga oleh Row Level Security di database).
module.exports = (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).json({
    url: process.env.SUPABASE_URL || '',
    anonKey: process.env.SUPABASE_ANON_KEY || ''
  });
};
