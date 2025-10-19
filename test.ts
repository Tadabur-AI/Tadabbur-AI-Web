import supabase from './src/utils/supabase';

async function query_test() {
    let { data: test, error } = await supabase
  .from('test')
  .select('*')
  return test;
}

query_test().then((result) => {
    console.log(result);
});
