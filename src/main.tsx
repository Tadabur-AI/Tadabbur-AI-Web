// import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './css/tailwind.css'
import './css/root.css'
import { Router } from './routing/router'
// import DownForMaintanance from './components/common/DownForMaintanance'

createRoot(document.getElementById('root')!).render(
  <>
  {/* <StrictMode> */}
    {/* <DownForMaintanance /> */}
    <Router />
  {/* </StrictMode> */}
  </>
  ,
)
