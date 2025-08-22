
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = 'https://ucjmbghkbfnknscqerfm.supabase.co';
const supabaseKey = 'your-service-role-key'; // Replace with your service role key

const supabase = createClient(supabaseUrl, supabaseKey);

// Admin account details
const adminEmail = 'admin@psu.edu.ph';
const adminPassword = 'Admin123!';

async function seedAdminAccount() {
  try {
    // Check if admin already exists in auth.users
    // Note: This requires service role key permissions
    const { data: existingUser, error: fetchError } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', adminEmail)
      .eq('role', true)
      .maybeSingle();

    if (fetchError) {
      throw fetchError;
    }

    if (existingUser) {
      console.log('Admin account already exists');
      return;
    }

    // Create the admin account
    const { data, error } = await supabase.auth.admin.createUser({
      email: adminEmail,
      password: adminPassword,
      email_confirm: true,
      user_metadata: {
        name: 'System Administrator',
        is_admin: true,
        position: 'DEAN'
      }
    });

    if (error) {
      throw error;
    }

    console.log('Admin account created successfully:', data);
  } catch (error) {
    console.error('Error creating admin account:', error);
  }
}

seedAdminAccount();
