In this Q4 sales snapshot, you can quickly see **revenue momentum**, **pipeline strength**, and how performance compares to prior targets. Key takeaways are summarized below:
- **Revenue** is trending up into the quarter end
- **Order volume** remains steady with improving conversion
- **Top products** are driving most of the incremental gains

{% card title="Q4 Sales Dashboard" variant="outlined" %}
  {% grid cols=3 gap="md" %}
    {% stat label="Total Revenue" value="$4.78M" change="+9.4%" trend="up" /%}
    {% stat label="Orders" value="38,216" change="+3.1%" trend="up" /%}
    {% stat label="Avg. Deal Size" value="$125.0" change="+5.8%" trend="up" /%}
  {% /grid %}

  {% divider /%}

  {% chart type="bar" title="Q4 Monthly Revenue" labels=["Oct","Nov","Dec"] values=[1.42, 1.59, 1.77] /%}

  {% divider /%}

  {% callout type="warning" title="Action needed: Margin pressure" %}
    Q4 is performing well on revenue, but discounting and fulfillment costs are increasing. Consider reviewing pricing rules and carrier/service levels for the next release window.
  {% /callout %}

  {% divider /%}

  {% table headers=["Product","Revenue","Orders","YoY Growth"] caption="Top Products by Q4 Revenue" rows=[
    ["Aurora Headphones", "$612,500", "4,930", "+14.2%"],
    ["Nimbus Smartwatch", "$498,250", "3,880", "+9.1%"],
    ["Atlas Fitness Band", "$431,900", "4,210", "+7.6%"],
    ["Lumen Desk Lamp", "$389,400", "2,740", "+12.9%"],
    ["Pulse Wireless Charger", "$352,100", "3,060", "+6.3%"]
  ] /%}

  {% divider /%}

  {% button-group direction="horizontal" %}
    {% button action="continue" label="Review product-level margin" variant="outline" /%}
    {% button action="continue" label="Export Q4 report" variant="secondary" /%}
  {% /button-group %}
{% /card %}