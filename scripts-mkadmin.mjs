import { createClient } from '@supabase/supabase-js';
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const setores = ['patrimonio','refrigeracao'];
for (const s of setores) {
  const email = `admin@${s}.local`;
  // try create
  const { data, error } = await sb.auth.admin.createUser({
    email, password: '123456', email_confirm: true,
    user_metadata: { full_name: 'Admin', setor: s },
  });
  let userId = data?.user?.id;
  if (error) {
    console.log(s, 'create err:', error.message);
    const { data: list } = await sb.auth.admin.listUsers({ page:1, perPage:1000 });
    userId = list.users.find(u=>u.email===email)?.id;
    if (userId) await sb.auth.admin.updateUserById(userId, { password: '123456', email_confirm: true });
  }
  console.log(s, 'userId:', userId);
  if (userId) {
    const { error: pe } = await sb.from('perfis').upsert({
      id: userId, full_name: 'Admin', email, setor: s, role: 'admin', ativo: true,
    });
    if (pe) console.log('perfil err', pe.message);
  }
}
