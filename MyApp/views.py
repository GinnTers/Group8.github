from django.http import JsonResponse, HttpResponseRedirect
from django.shortcuts import render
from django.utils.dateparse import parse_datetime
from django.utils import timezone
import csv
from .models import Customer, Product, Order, OrderDetail
from .forms import UploadFileForm

# Upload CSV File View
def upload_csv(request):
    if request.method == 'POST':
        form = UploadFileForm(request.POST, request.FILES)
        if form.is_valid():
            csv_file = request.FILES['file']

            if not csv_file.name.endswith('.csv'):
                return render(request, 'upload_data.html', {'error': 'File không phải là định dạng CSV'})

            try:
                file_data = csv_file.read().decode('utf-8').splitlines()
                csv_reader = csv.reader(file_data)
                header = next(csv_reader)  # Bỏ qua dòng tiêu đề
                
                # Kiểm tra số cột hợp lệ (giả định file có 16 cột)
                expected_columns = 16
                if len(header) != expected_columns:
                    return render(request, 'upload_data.html', {'error': f'File CSV không hợp lệ. Yêu cầu {expected_columns} cột.'})

                customers = {}
                products = {}
                orders = []
                order_details = []

                for row in csv_reader:
                    if len(row) != expected_columns:
                        continue  # Bỏ qua dòng lỗi

                    # Xử lý Customer
                    customer_id = row[2]
                    if customer_id not in customers:
                        customer, _ = Customer.objects.get_or_create(
                            customer_id=customer_id,
                            defaults={
                                'name': row[3],
                                'segment_code': row[4],
                                'segment_description': row[5],
                                'job': row[13],  # Nghề nghiệp
                                'age': row[14],  # Độ tuổi
                                'objective': row[15]  # Mục đích
                            }
                        )
                        customers[customer_id] = customer

                    # Xử lý Product
                    product_code = row[8]
                    if product_code not in products:
                        product, _ = Product.objects.get_or_create(
                            product_code=product_code,
                            defaults={
                                'product_name': row[9],
                                'group_code': row[6],
                                'group_name': row[7],
                                'price': row[11]
                            }
                        )
                        products[product_code] = product

                    # Xử lý Order
                    order_code = row[1]
                    order, created = Order.objects.get_or_create(
                        order_code=order_code,
                        customer=customers[customer_id],
                        defaults={'created_at': parse_datetime(row[0].replace(' ', 'T'))}
                    )
                    if created:
                        orders.append(order)

                    # Xử lý OrderDetail
                    order_details.append(
                        OrderDetail(
                            order=order,
                            product=products[product_code],
                            quantity=int(row[10]),
                            total_amount=row[12]
                        )
                    )

                # Lưu dữ liệu hàng loạt để tối ưu hiệu suất
                if order_details:
                    OrderDetail.objects.bulk_create(order_details)

            except Exception as e:
                return render(request, 'upload_data.html', {'error': f'Lỗi trong quá trình xử lý file: {e}'})

            return render(request, 'upload_data.html', {'success': 'Tải lên dữ liệu thành công!'})
    else:
        form = UploadFileForm()

    products = Product.objects.all()
    groups = Product.objects.values('group_code', 'group_name').distinct()

    return render(request, 'upload_data.html', {'form': form, 'products': products, 'groups': groups})


# Trả dữ liệu về cho D3.js
def visualize_data(request):
    order_details = OrderDetail.objects.all().select_related('product', 'order', 'order__customer').values(
        'order__order_code',
        'order__customer__customer_id',
        'product__product_code',
        'product__product_name',
        'product__group_code',
        'product__group_name',
        'order__created_at',
        'quantity',
        'total_amount',
        'order__customer__job',
        'order__customer__age',
        'order__customer__objective'
    )

    data = [
        {
            "Mã đơn hàng": item['order__order_code'],
            "Mã khách hàng": item['order__customer__customer_id'],
            "Mã mặt hàng": item['product__product_code'],
            "Tên mặt hàng": item['product__product_name'],
            "Mã nhóm hàng": item['product__group_code'],
            "Tên nhóm hàng": item['product__group_name'],
            "Thời gian tạo đơn": item['order__created_at'].strftime('%Y-%m-%d %H:%M:%S') if item['order__created_at'] else "",
            "SL": item['quantity'],
            "Thành tiền": item['total_amount'],
            "Nghề nghiệp": item['order__customer__job'],
            "Độ tuổi": item['order__customer__age'],
            "Mục đích": item['order__customer__objective']
        }
        for item in order_details
    ]

    return JsonResponse(data, safe=False)


# Thêm đơn hàng mới
def add_order(request):
    products = Product.objects.all()
    groups = Product.objects.values('group_code', 'group_name').distinct()

    if request.method == 'POST':
        customer, _ = Customer.objects.get_or_create(
            customer_id=request.POST['customer_id'],
            defaults={
                'name': request.POST['customer_name'],
                'job': request.POST['job'],
                'age': request.POST['age'],
                'objective': request.POST['objective']
            }
        )

        order, _ = Order.objects.get_or_create(
            order_code=request.POST['order_code'],
            customer=customer,
            defaults={'created_at': timezone.now()}
        )

        product_code = request.POST['product_code']
        product = Product.objects.get(product_code=product_code)

        OrderDetail.objects.create(
            order=order,
            product=product,
            quantity=int(request.POST['quantity']),
            total_amount=request.POST['total_amount']
        )

        return HttpResponseRedirect('/upload/')

    return render(request, 'upload_data.html', {'products': products, 'groups': groups})


# API - Lấy sản phẩm theo Mã Nhóm Hàng (AJAX Request)
def get_products_by_group(request, group_code):
    products = Product.objects.filter(group_code=group_code).values('product_code', 'product_name')
    return JsonResponse({"products": list(products)}, safe=False)


# Trang chính hiển thị biểu đồ
def index(request):
    return render(request, 'index.html')
