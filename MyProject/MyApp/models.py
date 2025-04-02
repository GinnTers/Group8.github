from django.db import models

# Create your models here.
class Customer(models.Model):
    customer_id = models.CharField(max_length=20, unique=True)
    name = models.CharField(max_length=100)
    segment_code = models.CharField(max_length=10)
    segment_description = models.TextField()
    job = models.CharField(max_length=100)
    age = models.CharField(max_length=50)
    objective = models.CharField(max_length=100)

    def __str__(self):
        return self.name


class Product(models.Model):
    product_code = models.CharField(max_length=20, unique=True)
    product_name = models.CharField(max_length=100)
    group_code = models.CharField(max_length=10)
    group_name = models.CharField(max_length=100)
    price = models.DecimalField(max_digits=10, decimal_places=2)

    def __str__(self):
        return self.product_name


class Order(models.Model):
    order_code = models.CharField(max_length=20, unique=True)
    customer = models.ForeignKey(Customer, on_delete=models.CASCADE)
    created_at = models.DateTimeField()

    def __str__(self):
        return self.order_code


class OrderDetail(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='order_details')
    product = models.ForeignKey(Product, on_delete=models.CASCADE)
    quantity = models.IntegerField()
    total_amount = models.DecimalField(max_digits=10, decimal_places=2)

    def __str__(self):
        return f'{self.order.order_code} - {self.product.product_name}'
