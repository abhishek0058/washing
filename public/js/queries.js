var history = []
$.getJSON(`/queries/all`, result => {
    showQueries(result)
})
showQueries = data => {
    var showQueries = `<table class='table table-bordered'>

                    <thead>
                    <th>S No.</th>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Mobile</th>
                    <th>Address</th>
                    <th>Message</th>
                    <th>Date</th>`
    $.each(data['result'], (i, item) => {
        showQueries += `<tr>
                        <td>${i+1}</td>
                        <td>${item.name}</td>
                        <td>${item.email}</td>
                        <td>${item.mobile}</td>
                        <td>${item.address}</td>
                        <td>${item.message}</td>
                        <td>${item.current_date}</td>
                        </tr>`
    })
    $('#result').html(showQueries);
}
