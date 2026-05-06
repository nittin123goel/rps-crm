import * as XLSX from 'xlsx';

// Convert ISO date (YYYY-MM-DD) → Excel serial used by Farvision template
function dateToExcelSerial(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const epoch = new Date(Date.UTC(1899, 11, 30));
  return Math.floor((d - epoch) / 86400000);
}

/**
 * Build a Farvision-compatible xlsx Buffer from an array of fully-loaded
 * application records. Each `app` should look like:
 *   {
 *     project: { name, fiscal_year },
 *     unit_number, entry_type, document_date, broker_name, remarks,
 *     mobile, email, phone,
 *     addr_line1, addr_line2, addr_line3, city, state, country, postal_code,
 *     applicants: [ { is_primary, salutation, first_name, ... }, ... ]
 *   }
 */
export function buildFarvisionXlsx(apps) {
  const bookingRows = [], applicantRows = [], addressRows = [];
  const emailRows = [], phoneRows = [], mobileRows = [], faxRows = [];

  apps.forEach((app, i) => {
    const importRef = i + 1;
    bookingRows.push({
      ImportLinkRefCode: importRef,
      FiscalYear: app.project?.fiscal_year || '01-04-2025-31-03-2026',
      'Business Unit': app.project?.name || '',
      EntryTypes: app.entry_type || 'FLAT APPLICATION',
      PrefixType: app.entry_type || 'FLAT APPLICATION',
      DocumentNo: '',
      GSTIN: '',
      DocumentDate: dateToExcelSerial(app.document_date),
      Remarks: app.remarks || '',
      Opportunity: '',
      ...Object.fromEntries(Array.from({length: 25}, (_,k) => ['UDF_'+(k+1), ''])
        .filter(([k]) => k !== 'UDF_16')),
      UDF_24: app.unit_number ? '- ' + app.unit_number : '',
      UDF_25: app.broker_name || ''
    });

    (app.applicants || []).forEach((a, ai) => {
      const detailRef = ai === 0 ? importRef : `${importRef}.${ai+1}`;
      applicantRows.push({
        ImportLinkRefCode: importRef,
        'Detail Link Ref Code': detailRef,
        IsPrimary: a.is_primary ? 'TRUE' : 'FALSE',
        Salutation: a.salutation || '',
        'First Name': a.first_name || '',
        MiddleName: a.middle_name || '',
        LastName: a.last_name || '',
        'Date of Birth': a.dob ? dateToExcelSerial(a.dob) : '',
        'Date of Anniversary': '',
        Gender: a.gender || '',
        Relationship: a.relationship || '',
        RelativeName: a.relative_name || '',
        RelativeType: '',
        CoApplicants: ai === 0 ? (app.applicants.length - 1) : '',
        DisplaySeqNo: ai + 1,
        PAN: a.pan || '',
        AadharNo: a.aadhar || '',
        Image: ''
      });
    });

    addressRows.push({
      ImportLinkRefCode: importRef,
      'Detail Link Ref Code': importRef,
      ReferenceOf: 'Customer',
      AddressType: 'Correspondence',
      AddressLine1: app.addr_line1 || '',
      AddressLine2: app.addr_line2 || '',
      AddressLine3: app.addr_line3 || '',
      City: app.city || '',
      State: app.state || '',
      Country: app.country || 'India',
      'Postal Code': app.postal_code || ''
    });

    if (app.email)  emailRows.push(commRow(importRef, 'Email',  app.email));
    if (app.phone)  phoneRows.push(commRow(importRef, 'Phone',  app.phone));
    if (app.mobile) mobileRows.push(commRow(importRef, 'Mobile', app.mobile));
  });

  const wb = XLSX.utils.book_new();
  const bookingHeader = ['ImportLinkRefCode','FiscalYear','Business Unit','EntryTypes','PrefixType',
    'DocumentNo','GSTIN','DocumentDate','Remarks','Opportunity',
    ...Array.from({length:15},(_,k)=>'UDF_'+(k+1)),
    'UDF_17','UDF_18','UDF_19','UDF_20','UDF_21','UDF_22','UDF_23','UDF_24','UDF_25'];

  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(bookingRows, { header: bookingHeader }), 'BookingApplication');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(applicantRows, {
    header: ['ImportLinkRefCode','Detail Link Ref Code','IsPrimary','Salutation','First Name','MiddleName','LastName',
      'Date of Birth','Date of Anniversary','Gender','Relationship','RelativeName','RelativeType','CoApplicants','DisplaySeqNo','PAN','AadharNo','Image']
  }), 'Applicant');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(addressRows, {
    header: ['ImportLinkRefCode','Detail Link Ref Code','ReferenceOf','AddressType','AddressLine1','AddressLine2','AddressLine3','City','State','Country','Postal Code']
  }), 'Addresses');

  const ch = ['ImportLinkRefCode','Detail Link Ref Code','ReferenceOf','AddressType','CommType','Value','IsPrimary'];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(emailRows,  { header: ch }), 'Email');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(phoneRows,  { header: ch }), 'Phone');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(mobileRows, { header: ch }), 'MobilePhone');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(faxRows,    {
    header: ['ImportLinkRefCode','Detail Link Ref Code','ReferenceOf','AddressType','CommType','Value']
  }), 'Fax');

  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
}

function commRow(ref, type, value) {
  return {
    ImportLinkRefCode: ref, 'Detail Link Ref Code': ref,
    ReferenceOf: 'Customer', AddressType: 'Correspondence',
    CommType: type, Value: value, IsPrimary: 'TRUE'
  };
}
