import React from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { UserProfile, Certificate } from './types';
import { FileDown } from 'lucide-react';

interface ResumeBuilderProps {
  user: UserProfile;
  certificates: Certificate[];
}

export const ResumeBuilder: React.FC<ResumeBuilderProps> = ({ user, certificates }) => {
  const generatePDF = () => {
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(22);
    doc.setTextColor(40, 40, 40);
    doc.text(user.displayName, 105, 20, { align: 'center' });
    
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`${user.email} | ${user.contact || 'N/A'}`, 105, 28, { align: 'center' });
    
    // Bio
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.text('Professional Summary', 20, 40);
    doc.setFontSize(10);
    doc.setTextColor(60, 60, 60);
    const splitBio = doc.splitTextToSize(user.bio || 'No bio provided.', 170);
    doc.text(splitBio, 20, 48);
    
    let currentY = 70;

    // Education
    if (user.educationList && user.educationList.length > 0) {
      doc.setFontSize(14);
      doc.setTextColor(0, 0, 0);
      doc.text('Education', 20, currentY);
      currentY += 8;
      user.educationList.forEach(edu => {
        doc.setFontSize(10);
        doc.setTextColor(40, 40, 40);
        doc.setFont('helvetica', 'bold');
        doc.text(edu.institution, 20, currentY);
        doc.setFont('helvetica', 'normal');
        doc.text(edu.year, 190, currentY, { align: 'right' });
        currentY += 5;
        doc.setTextColor(100, 100, 100);
        doc.text(edu.degree, 20, currentY);
        currentY += 10;
      });
      currentY += 5;
    }

    // Experience
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.text('Experience', 20, currentY);
    currentY += 8;
    
    if (user.experienceList && user.experienceList.length > 0) {
      user.experienceList.forEach(exp => {
        doc.setFontSize(11);
        doc.setTextColor(40, 40, 40);
        doc.setFont('helvetica', 'bold');
        doc.text(exp.role, 20, currentY);
        doc.setFont('helvetica', 'normal');
        doc.text(exp.duration, 190, currentY, { align: 'right' });
        currentY += 5;
        doc.setTextColor(100, 100, 100);
        doc.text(exp.company, 20, currentY);
        currentY += 6;
        doc.setFontSize(10);
        doc.setTextColor(60, 60, 60);
        const splitDesc = doc.splitTextToSize(exp.description, 170);
        doc.text(splitDesc, 20, currentY);
        currentY += (splitDesc.length * 5) + 8;
      });
    } else {
      doc.setFontSize(10);
      doc.setTextColor(60, 60, 60);
      const splitExp = doc.splitTextToSize(user.experience || 'No experience listed.', 170);
      doc.text(splitExp, 20, currentY);
      currentY += (splitExp.length * 5) + 10;
    }
    
    // Skills
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.text('Skills', 20, currentY);
    currentY += 8;
    doc.setFontSize(10);
    doc.setTextColor(60, 60, 60);
    const certSkills = Array.from(new Set(certificates.flatMap(c => c.keywords)));
    const allSkills = [...certSkills, ...(user.manualSkills || [])].join(', ');
    const splitSkills = doc.splitTextToSize(allSkills || 'No skills listed.', 170);
    doc.text(splitSkills, 20, currentY);
    currentY += (splitSkills.length * 5) + 10;

    // Projects
    if (user.projectList && user.projectList.length > 0) {
      doc.setFontSize(14);
      doc.setTextColor(0, 0, 0);
      doc.text('Projects', 20, currentY);
      currentY += 8;
      user.projectList.forEach(proj => {
        doc.setFontSize(10);
        doc.setTextColor(40, 40, 40);
        doc.setFont('helvetica', 'bold');
        doc.text(proj.title, 20, currentY);
        doc.setFont('helvetica', 'normal');
        if (proj.link) {
          doc.setTextColor(79, 70, 229);
          doc.text(proj.link, 190, currentY, { align: 'right' });
          doc.setTextColor(40, 40, 40);
        }
        currentY += 5;
        doc.setTextColor(60, 60, 60);
        const splitProjDesc = doc.splitTextToSize(proj.description, 170);
        doc.text(splitProjDesc, 20, currentY);
        currentY += (splitProjDesc.length * 5) + 8;
      });
      currentY += 5;
    }

    // Verified Certificates
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.text('Verified Credentials (Blockchain Backed)', 20, currentY);
    
    const tableData = certificates.map(cert => [
      cert.title,
      cert.verified ? 'Verified' : 'Pending',
      `${cert.trustScore}%`,
      cert.certHash.substring(0, 10) + '...'
    ]);
    
    autoTable(doc, {
      startY: currentY + 8,
      head: [['Certificate', 'Status', 'Trust Score', 'Blockchain Hash']],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [79, 70, 229] }
    });
    
    // Footer
    const finalY = (doc as any).lastAutoTable?.finalY || 150;
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text('Generated by SIH25200 TrustChain - Blockchain Verified Resume', 105, finalY + 20, { align: 'center' });
    
    doc.save(`${user.displayName.replace(/\s+/g, '_')}_Resume.pdf`);
  };

  return (
    <button
      onClick={generatePDF}
      className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
    >
      <FileDown size={18} />
      Download Verified Resume
    </button>
  );
};
