#include <stdio.h>
#include <locale.h>

int main(void) {
    setlocale(LC_ALL, "");

    int value = 10;
    int *p = &value;
    int **pp = &p; // p의 주소를 가리키는 포인터

    printf("value = %d\n", value);
    printf("*p = %d\n", *p);
    printf("**pp = %d\n", **pp);

    **pp = 99; // pp → p → value
    printf("value (after **pp = 99) = %d\n", value);
    return 0;
}
