import React from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import { AuthProvider } from './context/AuthContext';
//import logo from './logo.svg';
import 'react-toastify/dist/ReactToastify.css';
import './App.css';
import Header from './components/header/Header';
import Footer from './components/Footer/Footer';
import Home from './pages/Home/Home';
import CalculationList from './components/CalculationList';
import CalculationDetail from './components/CalculationDetail';
import CalculationUpsert from './components/CalculationUpsert';
import SolutionsUpsert2 from './components/SolutionsUpsert2';
// import AdminPanel from './components/AdminPanel/AdminPanel';
import AdminPanel2 from './pages/AdminPanel/AdminPanel2';
import RegisterPage from './pages/RegisterPage/RegisterPage';
import ProfilePage from './pages/ProfilePage/ProfilePage';
import NotificationsPage from './pages/NotificationsPage/NotificationsPage';
import SecurityPolicyPage from './pages/SecurityPolicy/SecurityPolicyPage';
import AsutpPage from './pages/InfoPage/AsutpPage';
import AsutpContacts from './components/InfoPage/AsutpContacts';
import BanSocNet from './components/InfoPage/BanSocNet';
import HistoryPanel from './pages/HistoriesPage/HistoryPanel';

function App() {    
  return (
    <AuthProvider>
      <div className="App">
        <ToastContainer />
        {/* <Router basename="/site"> */}
        <Router>
          <Header />
          <main className='main-content'>
            <Routes>
              {/* <Route index element={<Navigate to="/" replace />} /> */}
              {/* <Route path="" element={<Navigate to="/" replace />} /> */}
              <Route path='/' element={<Home />} />
              <Route path='/calculations' element = {<CalculationList  />}  />
              <Route path="/calculations/:id" element={<CalculationDetail />} />
              <Route path="/calculations/new" element={<CalculationUpsert />}/>
              <Route path="/calculations/:id/edit" element={<CalculationUpsert />}/>
              <Route path="/calculations/:id/solutions/:countDensities" element={<SolutionsUpsert2 />}/>
              {/* <Route path='/adminpanel' element={<AdminPanel />}/> */}
              <Route path='/adminpanel2' element={<AdminPanel2 />}/>
              <Route path='/profile' element={<ProfilePage />}/>
              <Route path='/register' element={<RegisterPage  />}/>
              <Route path='/notifications' element={<NotificationsPage  />}/>
              <Route path='/securitypolicy' element={<SecurityPolicyPage  />}/>
              <Route path='/asutpinfo' element={<AsutpPage  />}/>
              <Route path='/asutpcontact' element={<AsutpContacts  />}/>
              <Route path='/bacsocnet' element={<BanSocNet  />}/>
              <Route path='/histories' element={<HistoryPanel  />}/>
            </Routes>                  
          </main>
          <Footer  />
          {/* <div className='fixed-bottom align-self-stretch d-flex flex-row'><Footer  /></div> */}
          {}
        </Router>        
      </div>
    </AuthProvider>    
  );
}

export default App;
