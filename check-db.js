
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Using the service role key would be ideal, but we only have the anon key in env.
// However, we can try to inspect public data if RLS allows it, or check if we can Insert/Select.
// Since we are running outside the auth context, we will be 'anon'.

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkData() {
    console.log('--- DIAGNOSTIC START ---');

    // 1. Check Sessions
    const { data: sessions, error: sessError } = await supabase.from('sessions').select('*');
    if (sessError) console.error('Error fetching sessions:', sessError);
    else console.log(`Found ${sessions.length} sessions.`);

    if (sessions && sessions.length > 0) {
        const sessionId = sessions[0].id;
        console.log(`Checking responses for session: ${sessionId}`);

        // 2. Check Participants
        const { count: partCount, error: partError } = await supabase
            .from('participants')
            .select('*', { count: 'exact', head: true })
            .eq('session_id', sessionId);

        if (partError) console.error('Error checking participants:', partError);
        else console.log(`Participants in session: ${partCount}`);

        // 3. Check Responses (This might fail due to RLS if we are anon)
        const { count: respCount, error: respError } = await supabase
            .from('responses')
            .select('*', { count: 'exact', head: true })
            .eq('session_id', sessionId);

        if (respError) {
            console.error('Error checking responses (likely RLS):', respError.message);
            console.log('NOTE: If this fails, it means RLS is working correctly to block anon access.');
        } else {
            console.log(`Responses found (public access?): ${respCount}`);
        }
    }
    console.log('--- DIAGNOSTIC END ---');
}

checkData();
