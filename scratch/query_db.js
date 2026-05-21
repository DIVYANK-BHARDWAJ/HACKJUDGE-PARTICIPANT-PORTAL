async function test() {
  const response = await fetch('https://npgydwqyjqwcixsxydse.supabase.co/rest/v1/', {
    headers: {
      'apikey': 'sb_publishable_rccGSE1WB1VyBmXfIgBSMw_SiCvhC_8',
      'Authorization': 'Bearer sb_publishable_rccGSE1WB1VyBmXfIgBSMw_SiCvhC_8'
    }
  });
  const data = await response.json();
  console.log(data);
}

test();
